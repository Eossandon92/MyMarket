"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from api.models import db, User, Product, Order, OrderItem, Category, CashSession, Business
from werkzeug.security import generate_password_hash, check_password_hash
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import os
import requests
from bs4 import BeautifulSoup
from google import genai
from thefuzz import process, fuzz
import json
import pandas as pd
import io

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

# Need to configure these in the .env later
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
SEARCH_ENGINE_ID = "b72fe7b9736c2438c" 


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

# ─────────────────────────────────────────────
# BUSINESS endpoints
# ─────────────────────────────────────────────

@api.route('/business', methods=['GET'])
@jwt_required()
def get_businesses():
    claims = get_jwt()
    if claims.get('role') != 'superadmin':
        return jsonify({"msg": "Unauthorized"}), 403
        
    businesses = Business.query.order_by(Business.name.asc()).all()
    # For the superadmin dashboard we might want to know how many users each has, 
    # but for now we just return the business serialization
    return jsonify([b.serialize() for b in businesses]), 200

@api.route('/business', methods=['POST'])
@jwt_required()
def create_business():
    claims = get_jwt()
    if claims.get('role') != 'superadmin':
        return jsonify({"msg": "Unauthorized. Only superadmin can create tenants."}), 403

    data = request.json
    required_fields = ['name', 'slug', 'admin_name', 'admin_email', 'admin_password']
    if not data or not all(k in data for k in required_fields):
        return jsonify({"msg": f"Missing required fields: {required_fields}"}), 400
        
    if Business.query.filter_by(slug=data['slug']).first():
        return jsonify({"msg": "Slug already in use"}), 400
        
    if User.query.filter_by(email=data['admin_email'].strip().lower()).first():
        return jsonify({"msg": "Email already in use by another user"}), 400

    # Create the Business
    business = Business(name=data['name'].strip(), slug=data['slug'].strip())
    db.session.add(business)
    db.session.flush() # flush to get business.id without committing yet
    
    # Create the tenant's admin User
    user = User(
        business_id=business.id,
        name=data['admin_name'].strip(),
        email=data['admin_email'].strip().lower(),
        password=generate_password_hash(data['admin_password']),
        role="admin",
        is_active=True
    )
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        "business": business.serialize(),
        "admin_user": user.serialize()
    }), 201

# Note: Adding a PUT and DELETE route for Businesses later could be useful, but out of scope for MVP.
@api.route('/business/<int:id>', methods=['GET'])
def get_business(id):
    business = Business.query.get(id)
    if not business:
        return jsonify({"msg": "Business not found"}), 404
    return jsonify(business.serialize()), 200


# ─────────────────────────────────────────────
# AUTH endpoints
# ─────────────────────────────────────────────

@api.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    required = ['business_id', 'name', 'email', 'password']
    if not data or not all(k in data for k in required):
        return jsonify({"msg": f"Missing fields: {required}"}), 400

    business = Business.query.get(data['business_id'])
    if not business:
        return jsonify({"msg": "Business not found"}), 404

    existing = User.query.filter_by(business_id=data['business_id'], email=data['email']).first()
    if existing:
        return jsonify({"msg": "Email already registered in this business"}), 400

    user = User(
        business_id=data['business_id'],
        name=data['name'].strip(),
        email=data['email'].strip().lower(),
        password=generate_password_hash(data['password']),
        role=data.get('role', 'cashier'),
        is_active=True
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.serialize()), 201

@api.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"msg": "Missing email or password"}), 400

    user = User.query.filter_by(
        email=data['email'].strip().lower()
    ).first()

    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    if not user.is_active:
        return jsonify({"msg": "Usuario inactivo"}), 403

    # Create JWT with user identity and useful claims
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "business_id": user.business_id,
            "business_name": user.business.name if user.business else "",
            "role": user.role,
            "name": user.name,
            "email": user.email
        }
    )

    return jsonify({
        "msg": "Login exitoso",
        "token": access_token,
        "user": user.serialize()
    }), 200


@api.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Returns the current authenticated user from the JWT token."""
    claims = get_jwt()
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"msg": "User not found"}), 404
    return jsonify({"user": user.serialize()}), 200


@api.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.json
    if not data or 'product_name' not in data:
        return jsonify({"msg": "Missing product_name"}), 400
        
    try:
        product_name = data['product_name']
        
        search_query = product_name
        
        try:
            # Bypass all API limits by directly scraping Bing Images
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            }
            
            formatted_query = search_query.replace(' ', '+')
            url = f"https://www.bing.com/images/search?q={formatted_query}"
            
            res = requests.get(url, headers=headers)
            
            if res.ok:
                soup = BeautifulSoup(res.text, 'html.parser')
                
                # Bing stores the high-res image URL in the 'm' attribute of 'a' tags with class 'iusc'
                a_tags = soup.find_all('a', class_='iusc')
                
                for a in a_tags:
                    m_data = a.get('m')
                    if m_data:
                        try:
                            # Use 'turl' (Thumbnail URL proxyed by Bing) to avoid 403 Forbidden hotlink blocks from murl
                            data = json.loads(m_data)
                            image_url = data.get('turl')
                            if image_url:
                                return jsonify({"image_url": image_url}), 200
                        except:
                            pass
            
            # Fallback if Yahoo fails to load anything valid
            return jsonify({"msg": "No se encontraron imágenes", "image_url": f"https://placehold.co/512x512?text={formatted_query}"}), 200

        except Exception as search_e:
            print("Error scraping images:", search_e)
            return jsonify({"msg": "Error en servidor", "image_url": "https://placehold.co/512x512?text=Error"}), 500
        
    except Exception as e:
        print("Error generating image:", e)
        return jsonify({"msg": "Error communicating with AI service"}), 500

@api.route('/categories', methods=['GET'])
def get_categories():
    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400
    categories = Category.query.filter_by(business_id=business_id).order_by(Category.name.asc()).all()
    return jsonify([category.serialize() for category in categories]), 200

@api.route('/categories', methods=['POST'])
def create_category():
    data = request.json
    if not data or 'name' not in data or 'business_id' not in data:
        return jsonify({"msg": "Missing category name or business_id"}), 400

    existing = Category.query.filter_by(business_id=data['business_id'], name=data['name'].strip()).first()
    if existing:
        return jsonify({"msg": "Category already exists in this business"}), 400

    new_category = Category(business_id=data['business_id'], name=data['name'].strip())
    db.session.add(new_category)
    db.session.commit()

    return jsonify(new_category.serialize()), 201

@api.route('/categories/<int:id>', methods=['PUT'])
def update_category(id):
    category = Category.query.get(id)
    if not category:
        return jsonify({"msg": "Category not found"}), 404

    data = request.json
    if not data or 'name' not in data:
        return jsonify({"msg": "Missing category name"}), 400

    category.name = data['name'].strip()
    db.session.commit()
    
    # Optional: Update all products matching older name if you want to keep them synced
    # We leave them as is for now since the schema keeps Product.category as a free string
    return jsonify(category.serialize()), 200

@api.route('/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    category = Category.query.get(id)
    if not category:
        return jsonify({"msg": "Category not found"}), 404

    db.session.delete(category)
    db.session.commit()
    
    return jsonify({"msg": "Category deleted successfully"}), 200


@api.route('/products', methods=['GET'])
def get_products():
    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400
    products = Product.query.filter_by(business_id=business_id).order_by(Product.id.asc()).all()
    return jsonify([product.serialize() for product in products]), 200

@api.route('/products/barcode/<string:barcode>', methods=['GET'])
def get_product_by_barcode(barcode):
    business_id = request.args.get('business_id', type=int)
    query = Product.query.filter_by(barcode=barcode)
    if business_id:
        query = query.filter_by(business_id=business_id)
    product = query.first()
    if not product:
        return jsonify({"msg": "Product not found"}), 404
    return jsonify(product.serialize()), 200

@api.route('/products', methods=['POST'])
def create_product():
    data = request.json
    if not data or 'name' not in data or 'price' not in data or 'category' not in data or 'business_id' not in data:
        return jsonify({"msg": "Missing required fields: name, price, category, business_id"}), 400

    new_product = Product(
        business_id=data['business_id'],
        name=data['name'],
        price=data['price'],
        category=data['category'],
        image_url=data.get('image_url', ''),
        stock=data.get('stock', 0),
        barcode=data.get('barcode', None) or None,
        description=data.get('description', None) or None,
        min_stock=data.get('min_stock', 5)
    )
    db.session.add(new_product)
    db.session.commit()

    return jsonify(new_product.serialize()), 201

@api.route('/products/<int:id>', methods=['PUT', 'PATCH'])
def update_product(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({"msg": "Product not found"}), 404

    data = request.json
    if 'name' in data:
        product.name = data['name']
    if 'price' in data:
        product.price = data['price']
    if 'category' in data:
        product.category = data['category']
    if 'image_url' in data:
        product.image_url = data['image_url']
    if 'stock' in data:
        product.stock = data['stock']
    if 'barcode' in data:
        product.barcode = data['barcode'] or None
    if 'description' in data:
        product.description = data['description'] or None
    if 'min_stock' in data:
        product.min_stock = int(data['min_stock'])

    db.session.commit()
    return jsonify(product.serialize()), 200

@api.route('/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({"msg": "Product not found"}), 404

    # Eliminar primero los order_items asociados para evitar ForeignKeyViolation
    OrderItem.query.filter_by(product_id=id).delete()
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({"msg": "Product deleted successfully"}), 200

@api.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    if not data or 'items' not in data or 'business_id' not in data:
        return jsonify({"msg": "Missing items or business_id"}), 400

    items_data = data['items']
    if not items_data or len(items_data) == 0:
        return jsonify({"msg": "Order must have at least one item"}), 400
        
    payment_method = data.get('payment_method', 'cash')

    new_order = Order(
        business_id=data['business_id'],
        user_id=data.get('user_id'),
        total_price=0,
        payment_method=payment_method
    )
    db.session.add(new_order)
    db.session.flush() # To get the order ID

    total_price = 0
    for item in items_data:
        product_id = item.get('product_id')
        quantity = item.get('quantity', 1)

        product = Product.query.get(product_id)
        if not product:
            db.session.rollback()
            return jsonify({"msg": f"Product with id {product_id} not found"}), 404
        
        # Opcional: descontar stock
        if product.stock < quantity:
            db.session.rollback()
            return jsonify({"msg": f"Not enough stock for {product.name}"}), 400
            
        product.stock -= quantity

        order_item = OrderItem(
            order_id=new_order.id,
            product_id=product.id,
            quantity=quantity,
            price_at_time=product.price
        )
        db.session.add(order_item)
        total_price += (product.price * quantity)

    new_order.total_price = total_price
    db.session.commit()

    return jsonify(new_order.serialize()), 201


@api.route('/products/low-stock', methods=['GET'])
def get_low_stock_products():
    """Returns products where stock <= min_stock, filtered by business"""
    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400
    products = Product.query.filter(
        Product.business_id == business_id,
        Product.stock <= Product.min_stock
    ).all()
    return jsonify([p.serialize() for p in products]), 200


from datetime import datetime, timedelta
from sqlalchemy import func

@api.route('/reports/sales', methods=['GET'])
def get_sales_report():
    """
    Query params:
      period: today | week | month | custom
      date_from: YYYY-MM-DD  (only for period=custom)
      date_to:   YYYY-MM-DD  (only for period=custom)
    """
    period = request.args.get('period', 'today')
    now = datetime.utcnow()

    if period == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end   = now
    elif period == 'week':
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end   = now
    elif period == 'month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end   = now
    elif period == 'custom':
        try:
            start = datetime.strptime(request.args.get('date_from', ''), '%Y-%m-%d')
            end   = datetime.strptime(request.args.get('date_to', ''),   '%Y-%m-%d')
            end   = end.replace(hour=23, minute=59, second=59)
        except ValueError:
            return jsonify({"msg": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        return jsonify({"msg": "Invalid period. Use: today, week, month, custom"}), 400

    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400

    orders = Order.query.filter(
        Order.business_id == business_id,
        Order.created_at >= start,
        Order.created_at <= end,
        Order.status == 'completed'
    ).order_by(Order.created_at.desc()).all()

    total_revenue = sum(o.total_price for o in orders)
    total_orders  = len(orders)
    avg_ticket    = (total_revenue / total_orders) if total_orders > 0 else 0

    # Productos más vendidos en el período
    product_sales = {}
    for order in orders:
        for item in order.items:
            pid = item.product_id
            pname = item.product.name if item.product else f"Producto #{pid}"
            if pid not in product_sales:
                product_sales[pid] = {"name": pname, "qty": 0, "revenue": 0.0}
            product_sales[pid]["qty"]     += item.quantity
            product_sales[pid]["revenue"] += item.price_at_time * item.quantity

    top_products = sorted(product_sales.values(), key=lambda x: x["qty"], reverse=True)[:10]

    return jsonify({
        "period": period,
        "date_from": start.isoformat(),
        "date_to":   end.isoformat(),
        "total_revenue": total_revenue,
        "total_orders":  total_orders,
        "avg_ticket":    round(avg_ticket, 2),
        "top_products":  top_products,
        "orders": [o.serialize() for o in orders]
    }), 200

@api.route('/reports/cash-register', methods=['GET'])
def cash_register_report():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({"msg": "Missing date parameter (YYYY-MM-DD)"}), 400

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"msg": "Invalid date format"}), 400

    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400

    # Get totals grouped by payment_method
    results = db.session.query(
        Order.payment_method, 
        func.sum(Order.total_price),
        func.count(Order.id)
    ).filter(
        Order.business_id == business_id,
        Order.status == 'completed',
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).group_by(Order.payment_method).all()

    summary = {
        "cash": {"total": 0, "count": 0},
        "card": {"total": 0, "count": 0},
        "mobile": {"total": 0, "count": 0},
        "total_revenue": 0,
        "total_orders": 0
    }

    for method, total, count in results:
        method_str = method if method in summary else "cash"
        summary[method_str]["total"] = float(total)
        summary[method_str]["count"] = count
        summary["total_revenue"] += float(total)
        summary["total_orders"] += count

    # Chequear si este día ya fue cerrado
    session = CashSession.query.filter_by(business_id=business_id, date=date_str).first()
    if session:
        return jsonify({
            "is_closed": True,
            "session_data": session.serialize(),
            "summary": summary
        }), 200

    return jsonify({
        "is_closed": False,
        "summary": summary
    }), 200

@api.route('/reports/cash-register/close', methods=['POST'])
def close_cash_register():
    body = request.get_json()
    if not body:
        return jsonify({"msg": "Body is required"}), 400

    date_str = body.get('date')
    business_id = body.get('business_id')
    starting_cash = body.get('starting_cash')
    counted_cash = body.get('counted_cash')
    counted_card = body.get('counted_card')
    user_id = body.get('user_id')

    if not date_str or not business_id or starting_cash is None or counted_cash is None or counted_card is None:
        return jsonify({"msg": "Missing fields: date, business_id, starting_cash, counted_cash, counted_card"}), 400

    # Ensure it's not already closed
    existing = CashSession.query.filter_by(business_id=business_id, date=date_str).first()
    if existing:
        return jsonify({"msg": "Cash register already closed for this date"}), 400

    new_session = CashSession(
        business_id=business_id,
        user_id=user_id,
        date=date_str,
        starting_cash=float(starting_cash),
        counted_cash=float(counted_cash),
        counted_card=float(counted_card)
    )

    try:
        db.session.add(new_session)
        db.session.commit()
        return jsonify(new_session.serialize()), 201
    except Exception as e:
        db.session.rollback()
        print("Error saving cash session:", str(e))
        return jsonify({"msg": "Internal server error"}), 500

@api.route('/inventory/scan-invoice', methods=['POST'])
def scan_invoice():
    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    if file:
        try:
            image_bytes = file.read()
            
            gemini_api_key = os.environ.get("GEMINI_API_KEY")
            if not gemini_api_key:
                return jsonify({"msg": "GEMINI_API_KEY is missing"}), 500
                
            client = genai.Client(api_key=gemini_api_key)
            
            prompt = """
            Eres un asistente contable súper rápido. Lee esta factura y devuélveme un JSON estricto con una lista de los productos cobrados (solo `nombre_factura`, `cantidad` y `precio_unitario`). Ignora subtotales e impuestos. El resultado DEBE ser un array de objetos JSON y NADA MAS sin formato markdown extra. Ejemplo:
            [
              {"nombre_factura": "CC 3L NR TP", "cantidad": 12, "precio_unitario": 2000}
            ]
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=file.mimetype,
                    )
                ]
            )
            
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            items = json.loads(text)
            
            all_products = Product.query.all()
            product_dict = {p.id: p.name for p in all_products}
            product_names = list(product_dict.values())
            
            results = []
            for item in items:
                nombre = item.get("nombre_factura", "")
                qty = item.get("cantidad", 0)
                precio = item.get("precio_unitario", 0)
                
                if product_names and nombre:
                    best_match, score = process.extractOne(nombre, product_names, scorer=fuzz.token_sort_ratio)
                    
                    matched_id = None
                    for pid, pname in product_dict.items():
                        if pname == best_match:
                            matched_id = pid
                            break
                    
                    confidence = "high" if score > 75 else ("medium" if score > 50 else "low")
                else:
                    best_match = None
                    matched_id = None
                    confidence = "none"
                
                results.append({
                    "invoice_item": nombre,
                    "invoice_qty": qty,
                    "invoice_price": precio,
                    "predicted_product_id": matched_id,
                    "predicted_product_name": best_match,
                    "confidence": confidence
                })
                
            return jsonify({"items": results}), 200
            
        except Exception as e:
            print("Error parsing invoice with Gemini: ", e)
            return jsonify({"msg": "Error processing document with AI", "error": str(e)}), 500

@api.route('/inventory/bulk-add', methods=['POST'])
def bulk_add_inventory():
    data = request.json
    if not data or 'items' not in data:
        return jsonify({"msg": "No items provided"}), 400
        
    items = data['items']
    updated_products = []
    
    try:
        for item in items:
            product_id = item.get('product_id')
            qty_to_add = item.get('qty_to_add', 0)
            
            if not product_id or qty_to_add <= 0:
                continue
                
            product = Product.query.get(product_id)
            if product:
                product.stock += qty_to_add
                updated_products.append(product.serialize())
                
        db.session.commit()
        return jsonify({"msg": "Stock updated successfully", "updated": updated_products}), 200
    except Exception as e:
        db.session.rollback()
        print("Error bulk updating stock:", str(e))
        return jsonify({"msg": "Internal server error"}), 500

@api.route('/inventory/upload', methods=['POST'])
@jwt_required()
def upload_inventory_excel():
    claims = get_jwt()
    business_id = claims.get('business_id')
    if not business_id:
        return jsonify({"msg": "Missing business_id in token"}), 401

    if 'file' not in request.files:
        return jsonify({"msg": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    try:
        # Use pandas ONLY to read the file into memory as a string
        filename = file.filename.lower()
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                df = pd.read_excel(file)
            except Exception as e:
                return jsonify({"msg": "Error leyendo el archivo Excel. Asegúrate de que no esté corrupto."}), 400
        else:
            return jsonify({"msg": "Formato de archivo no soportado. Sube un excel (.xlsx) o .csv"}), 400
            
        import json
        from google import genai
        
        # Convert first 150 rows to CSV text for the AI
        csv_string = df.head(150).to_csv(index=False)
        
        client = genai.Client(api_key=GOOGLE_API_KEY)
        prompt = f"""
        Eres un asistente inteligente avanzado. A continuación te pasaré el texto en CSV de un archivo Excel de inventario.
        Tu trabajo es extraer los productos y devolverme un arreglo JSON válido.
        
        REGLAS ESTRICTAS DE EXTRACCIÓN:
        - name: Extrae del campo "NOMBRE DEL PRODUCTO".
        - cost: Extrae del campo "COSTO UNITARI" (Opcional, si no existe o está vacío, pon 0). Limpia el símbolo $.
        - price: Extrae del campo "PRECIO DE VENT" (Opcional, si no existe o está vacío, pon 0). Limpia el símbolo $.
        - stock: Extrae del campo "STOCK" (Opcional, si no existe o está vacío, pon 0).
        - category_name: Extrae del campo "CATEGORIA". Si no existe, pon "General".
        
        IMPORTANTE: Devuelve TODOS los números de cost, price y stock como ENTEROS (int), no como texto. Por ejemplo, si dice "$ 1,800", debes devolver 1800.
        
        DEVUELVE ÚNICAMENTE EL ARREGLO JSON. Nada de texto antes ni código markdown. Solo `[ {{...}}, {{...}} ]`
        
        Datos CSV crudos:
        {csv_string}
        """
        
        response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
        text = response.text.strip()
        if text.startswith('```json'): text = text[7:]
        if text.startswith('```'): text = text[3:]
        if text.endswith('```'): text = text[:-3]
        text = text.strip()
        
        try:
            parsed_items = json.loads(text)
        except Exception as e:
            print("Failed to decode JSON from AI:", text[:100])
            return jsonify({"msg": "Error al interpretar la respuesta de la IA. Por favor intenta de nuevo."}), 500
        
        # Ensure all types are correct before returning
        for item in parsed_items:
            try: item["cost"] = int(float(item.get("cost", 0)))
            except: item["cost"] = 0
            
            try: item["price"] = int(float(item.get("price", 0)))
            except: item["price"] = 0
            
            try: item["stock"] = int(float(item.get("stock", 0)))
            except: item["stock"] = 0
            
            if "name" not in item or not item["name"]:
                item["name"] = "Producto Desconocido"
                
            if "category_name" not in item or not item["category_name"]:
                item["category_name"] = "General"
                
        return jsonify({"items": parsed_items}), 200

    except Exception as e:
        print("Error parsing excel with AI:", str(e))
        return jsonify({"msg": "Error al procesar el archivo con Inteligencia Artificial. Asegúrate de que no esté vacío."}), 500

@api.route('/inventory/confirm', methods=['POST'])
@jwt_required()
def confirm_inventory():
    claims = get_jwt()
    business_id = claims.get('business_id')
    if not business_id:
        return jsonify({"msg": "Missing business_id in token"}), 401

    data = request.json
    if not data or 'items' not in data:
        return jsonify({"msg": "No items provided"}), 400
        
    items = data['items']
    
    try:
        for item in items:
            cat_name = item.get('category_name', 'General').strip()
            # Find or Create Category
            category = Category.query.filter_by(business_id=business_id, name=cat_name).first()
            if not category:
                category = Category(business_id=business_id, name=cat_name)
                db.session.add(category)
                db.session.flush() # flush to get the category.id
            
            barcode = item.get('barcode')
            if pd.isna(barcode) or str(barcode).lower() == 'nan':
                barcode = None
            else:
                barcode = str(barcode).strip()
                
            # Create the Product
            product = Product(
                business_id=business_id,
                name=item.get('name', 'Producto Desconocido'),
                price=int(item.get('price', 0)),
                stock=int(item.get('stock', 0)),
                barcode=barcode,
                category=category.name  # Note: The Product model schema uses category string, not id
            )
            db.session.add(product)

        db.session.commit()
        return jsonify({"msg": f"Se insertaron {len(items)} productos con éxito"}), 201
        
    except Exception as e:
        db.session.rollback()
        print("Error confirming bulk import:", str(e))
        return jsonify({"msg": "Error interno al guardar los productos"}), 500
