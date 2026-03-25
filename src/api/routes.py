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
    plan = data.get('subscription_plan', 'basico')
    business = Business(name=data['name'].strip(), slug=data['slug'].strip(), subscription_plan=plan.strip().lower())
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

@api.route('/business/<int:id>', methods=['PUT'])
@jwt_required()
def update_business(id):
    claims = get_jwt()
    if claims.get('role') != 'superadmin':
        return jsonify({"msg": "Unauthorized. Only superadmin can edit tenants."}), 403

    business = Business.query.get(id)
    if not business:
        return jsonify({"msg": "Business not found"}), 404

    data = request.json
    if 'subscription_plan' in data:
        business.subscription_plan = data['subscription_plan'].strip().lower()
    if 'name' in data:
        business.name = data['name'].strip()
    if 'rut' in data:
        business.rut = data['rut'].strip() if data['rut'] else None
    if 'giro_comercial' in data:
        business.giro_comercial = data['giro_comercial'].strip() if data['giro_comercial'] else None
    if 'address' in data:
        business.address = data['address'].strip() if data['address'] else None
    if 'phone' in data:
        business.phone = data['phone'].strip() if data['phone'] else None
    if 'contact_email' in data:
        business.contact_email = data['contact_email'].strip() if data['contact_email'] else None
    if 'is_active' in data:
        business.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify(business.serialize()), 200

@api.route('/business/<int:id>', methods=['GET'])
def get_business(id):
    business = Business.query.get(id)
    if not business:
        return jsonify({"msg": "Business not found"}), 404
    return jsonify(business.serialize()), 200

# ─────────────────────────────────────────────
# USERS endpoints
# ─────────────────────────────────────────────

@api.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Unauthorized"}), 403
        
    business_id = claims.get('business_id')
    users = User.query.filter_by(business_id=business_id).all()
    return jsonify([u.serialize() for u in users]), 200

@api.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Unauthorized"}), 403
    
    business_id = claims.get('business_id')
    business = Business.query.get(business_id)
    
    # Plan validation
    if business.subscription_plan == "basico":
        current_users_count = User.query.filter_by(business_id=business_id).count()
        # Admin is 1, so max 1 cashier = 2 total
        if current_users_count >= 2:
            return jsonify({"msg": "Límite del Plan Básico alcanzado: No puedes tener más de 1 Cajero adicional. Mejora a Plan Pro para usuarios ilimitados."}), 403
            
    data = request.json
    required_fields = ['name', 'email', 'password']
    if not data or not all(k in data for k in required_fields):
        return jsonify({"msg": "Faltan campos (name, email, password)"}), 400
        
    if User.query.filter_by(business_id=business_id, email=data['email'].strip().lower()).first():
        return jsonify({"msg": "El email ya está registrado en tu empresa"}), 400
        
    new_user = User(
        business_id=business_id,
        name=data['name'].strip(),
        email=data['email'].strip().lower(),
        password=generate_password_hash(data['password']),
        role="cashier",
        is_active=True
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(new_user.serialize()), 201

@api.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({"msg": "Unauthorized"}), 403
        
    business_id = claims.get('business_id')
    user = User.query.filter_by(id=user_id, business_id=business_id).first()
    
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
        
    if user.id == get_jwt_identity():
        return jsonify({"msg": "No puedes eliminar tu propio usuario de administrador"}), 400
        
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "Usuario eliminado"}), 200



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

    # Check if the business is active (suspended by superadmin)
    if user.business and not user.business.is_active:
        return jsonify({"msg": "Tu negocio ha sido suspendido. Contacta al administrador del sistema."}), 403

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


import threading

def fetch_image_for_product(product_name):
    """Helper function to scrape Bing for an image URL based on a product name."""
    try:
        search_query = product_name
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        }
        formatted_query = search_query.replace(' ', '+')
        url = f"https://www.bing.com/images/search?q={formatted_query}"
        
        res = requests.get(url, headers=headers)
        if res.ok:
            soup = BeautifulSoup(res.text, 'html.parser')
            a_tags = soup.find_all('a', class_='iusc')
            for a in a_tags:
                m_data = a.get('m')
                if m_data:
                    try:
                        data = json.loads(m_data)
                        image_url = data.get('turl')
                        if image_url:
                            return image_url
                    except:
                        pass
                        
        return f"https://placehold.co/512x512?text={formatted_query}"
    except Exception as e:
        print(f"Error scraping image for {product_name}:", e)
        return "https://placehold.co/512x512?text=Error"


def process_images_in_background(app_context, products_data):
    """Background worker that fetches images for newly created products."""
    app_context.push()
    from api.models import db, Product
    try:
        for p_data in products_data:
            product_id = p_data['id']
            product_name = p_data['name']
            
            # Fetch image URL
            image_url = fetch_image_for_product(product_name)
            
            # Update product in database
            product = Product.query.get(product_id)
            if product:
                product.image_url = image_url
                db.session.commit()
                print(f"[Background Task] Updated image for product {product.id} ({product.name})")
    except Exception as e:
        db.session.rollback()
        print(f"[Background Task] Error updating images:", e)
    finally:
        db.session.remove()


@api.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.json
    if not data or 'product_name' not in data:
        return jsonify({"msg": "Missing product_name"}), 400
        
    try:
        product_name = data['product_name']
        image_url = fetch_image_for_product(product_name)
        if image_url == "https://placehold.co/512x512?text=Error":
            return jsonify({"msg": "Error en servidor", "image_url": image_url}), 500
        elif image_url.startswith("https://placehold.co"):
            return jsonify({"msg": "No se encontraron imágenes", "image_url": image_url}), 200
        else:
            return jsonify({"image_url": image_url}), 200
        
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
        min_stock=data.get('min_stock', 5),
        cost_price=data.get('cost_price', None)
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
    if 'cost_price' in data:
        product.cost_price = float(data['cost_price']) if data['cost_price'] is not None else None

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
        return jsonify({"msg": "Faltan productos o el identificador del negocio"}), 400

    items_data = data['items']
    if not items_data or len(items_data) == 0:
        return jsonify({"msg": "La orden debe tener al menos un producto"}), 400
        
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
    from api.models import Promotion
    
    for item in items_data:
        quantity = item.get('quantity', 1)
        is_promo = item.get('is_promotion', False)

        if is_promo:
            # Handle Promotion Pack
            real_promo_id = item.get('real_promo_id')
            promo = Promotion.query.get(real_promo_id)
            if not promo:
                db.session.rollback()
                return jsonify({"msg": f"Promoción {real_promo_id} no encontrada"}), 404
            
            # Check stock for all items inside the promo
            for p_item in promo.items:
                needed_qty = p_item.quantity * quantity
                if p_item.product.stock < needed_qty:
                    db.session.rollback()
                    return jsonify({"msg": f"No hay stock suficiente de {p_item.product.name} para armar el pack"}), 400
            
            # Deduct stock and add OrderItems
            promo_price_distributed = False
            for p_item in promo.items:
                p_item.product.stock -= (p_item.quantity * quantity)
                
                # Assign the price to the first item of the pack, others 0 for receipt purposes
                item_price = promo.price if not promo_price_distributed else 0
                promo_price_distributed = True
                
                order_item = OrderItem(
                    order_id=new_order.id,
                    product_id=p_item.product_id,
                    quantity=p_item.quantity * quantity,
                    price_at_time=item_price
                )
                db.session.add(order_item)
            
            total_price += (promo.price * quantity)

        else:
            # Normal Product
            product_id = item.get('product_id')
            product = Product.query.get(product_id)
            if not product:
                db.session.rollback()
                return jsonify({"msg": f"Producto con ID {product_id} no encontrado"}), 404
            
            if product.stock < quantity:
                db.session.rollback()
                return jsonify({"msg": f"No hay stock suficiente para {product.name}"}), 400
                
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


@api.route('/reports/balance', methods=['GET'])
def get_balance_report():
    """
    Balance de ganancias y pérdidas basado en productos vendidos.
    Compara precio de venta vs precio de costo de cada producto.
    Query params:
      business_id, period (today|week|month|custom), date_from, date_to
    """
    period = request.args.get('period', 'month')
    now = datetime.utcnow()

    if period == 'today':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'week':
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = now
    elif period == 'custom':
        try:
            start = datetime.strptime(request.args.get('date_from', ''), '%Y-%m-%d')
            end = datetime.strptime(request.args.get('date_to', ''), '%Y-%m-%d')
            end = end.replace(hour=23, minute=59, second=59)
        except ValueError:
            return jsonify({"msg": "Formato de fecha inválido. Usa YYYY-MM-DD"}), 400
    else:
        return jsonify({"msg": "Período inválido. Usa: today, week, month, custom"}), 400

    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400

    # Get all completed orders in the period
    orders = Order.query.filter(
        Order.business_id == business_id,
        Order.created_at >= start,
        Order.created_at <= end,
        Order.status == 'completed'
    ).order_by(Order.created_at.asc()).all()

    total_revenue = 0.0
    total_cost = 0.0
    total_promotional_loss = 0.0
    products_without_cost = set()
    product_profits = {}  # product_id -> {name, revenue, cost, profit, qty}
    daily_map = {}  # date_str -> {revenue, cost, profit}

    for order in orders:
        day_key = order.created_at.strftime('%Y-%m-%d') if order.created_at else '?'

        if day_key not in daily_map:
            daily_map[day_key] = {"day": day_key, "revenue": 0.0, "cost": 0.0, "profit": 0.0}

        for item in order.items:
            item_revenue = item.price_at_time * item.quantity
            total_revenue += item_revenue
            daily_map[day_key]["revenue"] += item_revenue

            # Calculate promo loss/discount
            if item.product:
                normal_expected_revenue = item.product.price * item.quantity
                if normal_expected_revenue > item_revenue:
                    total_promotional_loss += (normal_expected_revenue - item_revenue)

            # Calculate cost
            item_cost = 0.0
            if item.product and item.product.cost_price is not None:
                item_cost = item.product.cost_price * item.quantity
            elif item.product:
                products_without_cost.add(item.product.id)

            total_cost += item_cost
            daily_map[day_key]["cost"] += item_cost
            daily_map[day_key]["profit"] += (item_revenue - item_cost)

            # Per-product tracking
            pid = item.product_id
            pname = item.product.name if item.product else f"Producto #{pid}"
            if pid not in product_profits:
                product_profits[pid] = {"name": pname, "revenue": 0.0, "cost": 0.0, "profit": 0.0, "qty": 0, "has_cost": False}
            product_profits[pid]["revenue"] += item_revenue
            product_profits[pid]["cost"] += item_cost
            product_profits[pid]["profit"] += (item_revenue - item_cost)
            product_profits[pid]["qty"] += item.quantity
            if item.product and item.product.cost_price is not None:
                product_profits[pid]["has_cost"] = True

    gross_profit = total_revenue - total_cost
    margin_percent = round((gross_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

    # Sort daily breakdown
    daily_breakdown = sorted(daily_map.values(), key=lambda x: x["day"])

    # Top profitable (only those with cost defined)
    products_with_cost = [p for p in product_profits.values() if p["has_cost"]]
    top_profitable = sorted(products_with_cost, key=lambda x: x["profit"], reverse=True)[:10]
    top_losing = sorted(products_with_cost, key=lambda x: x["profit"])[:5]

    # Count total products without cost in the business
    total_products = Product.query.filter_by(business_id=business_id).count()
    products_with_cost_count = Product.query.filter(
        Product.business_id == business_id,
        Product.cost_price.isnot(None)
    ).count()

    return jsonify({
        "period": period,
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_promotional_loss": round(total_promotional_loss, 2),
        "gross_profit": round(gross_profit, 2),
        "margin_percent": margin_percent,
        "total_orders": len(orders),
        "products_without_cost": len(products_without_cost),
        "total_products": total_products,
        "products_with_cost_count": products_with_cost_count,
        "daily_breakdown": daily_breakdown,
        "top_profitable": top_profitable,
        "top_losing": top_losing
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
    try:
        filename = file.filename.lower()
        all_dfs = []
        sheet_info = []

        if filename.endswith('.csv'):
            df = pd.read_csv(file)
            df.columns = df.columns.astype(str).str.strip().str.upper()
            all_dfs.append(df)
            sheet_info.append({"name": "CSV", "rows": len(df)})

        elif filename.endswith('.xlsx') or filename.endswith('.xls'):
            import tempfile, os
            # Save to temp file first (avoids stream/seek issues)
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1])
            file.save(tmp)
            tmp.close()
            tmp_path = tmp.name

            try:
                # Strategy 1: Default pandas ExcelFile (openpyxl)
                xls = None
                read_error = None
                try:
                    xls = pd.ExcelFile(tmp_path, engine='openpyxl')
                except Exception as e1:
                    read_error = str(e1)
                    print(f"openpyxl failed: {e1}")
                    # Strategy 2: Try without specifying engine (lets pandas guess)
                    try:
                        xls = pd.ExcelFile(tmp_path)
                    except Exception as e2:
                        read_error = str(e2)
                        print(f"pandas auto-engine failed: {e2}")
                        # Strategy 3: Try xlrd for older .xls format
                        try:
                            xls = pd.ExcelFile(tmp_path, engine='xlrd')
                        except Exception as e3:
                            read_error = str(e3)
                            print(f"xlrd failed: {e3}")

                if xls is None:
                    os.unlink(tmp_path)
                    error_hint = ""
                    if "encrypt" in read_error.lower() or "password" in read_error.lower():
                        error_hint = " El archivo parece estar protegido con contraseña. Ábrelo en Excel, guárdalo como un nuevo archivo sin protección y vuelve a intentar."
                    elif "corrupt" in read_error.lower() or "not a valid" in read_error.lower():
                        error_hint = " El archivo parece estar corrupto. Ábrelo en Excel, guárdalo como un nuevo .xlsx y vuelve a intentar."
                    else:
                        error_hint = " Intenta abrirlo en Excel, haz clic en 'Habilitar edición' si está en Vista Protegida, luego guárdalo como un nuevo archivo .xlsx y súbelo de nuevo."
                    return jsonify({"msg": f"No se pudo leer el archivo Excel.{error_hint}"}), 400

                for sheet_name in xls.sheet_names:
                    try:
                        raw_df = pd.read_excel(xls, sheet_name=sheet_name, header=None)
                        
                        if raw_df.empty or len(raw_df) < 2:
                            continue
                        
                        # Find the header row by looking for product-related keywords
                        header_idx = 0
                        for idx, row in raw_df.head(20).iterrows():
                            row_str = " ".join([str(val).upper() for val in row if pd.notna(val)])
                            if any(kw in row_str for kw in ["NOMBRE", "PRODUCTO", "DESCRIPCION", "ARTICULO", "ITEM", "CODIGO", "BARRAS", "PRECIO", "STOCK"]):
                                header_idx = idx
                                break
                        
                        df = raw_df.copy()
                        df.columns = df.iloc[header_idx].astype(str).str.strip().str.upper()
                        df = df[header_idx + 1:].reset_index(drop=True)
                        
                        if len(df.columns) < 2 or len(df) < 1:
                            continue
                            
                        all_dfs.append(df)
                        sheet_info.append({"name": sheet_name, "rows": len(df)})
                    except Exception as sheet_err:
                        print(f"Error reading sheet '{sheet_name}': {sheet_err}")
                        continue
                
                # Cleanup temp file
                try:
                    os.unlink(tmp_path)
                except:
                    pass
                        
            except Exception as e:
                try:
                    os.unlink(tmp_path)
                except:
                    pass
                print("Excel Parse Error:", str(e))
                return jsonify({"msg": "Error leyendo el archivo Excel. Intenta abrirlo en Excel, habilitar edición si está en Vista Protegida, y guardarlo como un nuevo archivo .xlsx."}), 400
        else:
            return jsonify({"msg": "Formato de archivo no soportado. Sube un excel (.xlsx) o .csv"}), 400
        
        if not all_dfs:
            return jsonify({"msg": "No se encontraron datos en el archivo. Verifica que las hojas contengan información."}), 400

        # Smart column matching patterns: DB field -> possible column name fragments (longer first = more precise)
        COLUMN_PATTERNS = {
            'name':        ['NOMBRE DEL PRODUCTO', 'NOMBRE PRODUCTO', 'NOMBRE', 'PRODUCTO', 'ARTICULO', 'ITEM'],
            'barcode':     ['CODIGO DE BARRA', 'CÓDIGO DE BARRA', 'COD BARRA', 'CODIGO BARRA', 'COD. BARRA', 'CÓDIGO BARRA', 'BARCODE', 'EAN', 'UPC', 'SKU', 'CÓDIGO'],
            'price':       ['PRECIO VENTA', 'PRECIO', 'PVP', 'VALOR VENTA', 'VENTA'],
            'cost':        ['PRECIO COSTO', 'COSTO UNITARIO', 'COSTO', 'PRECIO COMPRA', 'COMPRA'],
            'stock':       ['STOCK', 'CANTIDAD', 'EXISTENCIA', 'INVENTARIO', 'CANT', 'QTY'],
            'category':    ['CATEGORIA', 'CATEGORÍA', 'CATEG', 'RUBRO', 'FAMILIA', 'GRUPO', 'TIPO'],
            'description': ['DESCRIPCION', 'DESCRIPCIÓN', 'DETALLE', 'OBS', 'NOTA', 'OBSERVACION'],
            'min_stock':   ['STOCK MINIMO', 'STOCK MÍNIMO', 'STOCK MIN', 'MINIMO', 'MÍNIMO'],
        }

        def find_column(cols, field):
            patterns = COLUMN_PATTERNS.get(field, [])
            for pattern in patterns:
                for c in cols:
                    c_str = str(c).strip().upper()
                    if c_str in ('NAN', '', 'NONE'):
                        continue
                    if pattern in c_str:
                        return c
            return None
        
        parsed_items = []
        columns_detected = {}
        
        def clean_number(val):
            if pd.isna(val) or val == "": return 0
            val_str = str(val).strip().replace('$', '').replace(',', '').replace(' ', '')
            # Handle dots as thousands separators (common in Chilean format: 1.500)
            if '.' in val_str and val_str.count('.') == 1:
                parts = val_str.split('.')
                if len(parts[1]) == 3:  # e.g. "1.500" = 1500
                    val_str = val_str.replace('.', '')
            try: return int(float(val_str))
            except: return 0

        def clean_barcode(val):
            if pd.isna(val) or str(val).strip().lower() in ['', 'nan', 'none', 'n/a']:
                return None
            val_str = str(val).strip()
            if val_str.endswith('.0'):
                val_str = val_str[:-2]
            return val_str if val_str else None

        for df in all_dfs:
            cols = df.columns.tolist()
            
            name_col = find_column(cols, 'name')
            barcode_col = find_column(cols, 'barcode')
            price_col = find_column(cols, 'price')
            cost_col = find_column(cols, 'cost')
            stock_col = find_column(cols, 'stock')
            cat_col = find_column(cols, 'category')
            desc_col = find_column(cols, 'description')
            min_stock_col = find_column(cols, 'min_stock')
            
            # If no name column, try description as fallback
            if not name_col and desc_col:
                name_col = desc_col
                desc_col = None
            
            if not name_col:
                continue
            
            columns_detected = {k: v for k, v in {
                "nombre": name_col, "codigo_barras": barcode_col,
                "precio": price_col, "costo": cost_col,
                "stock": stock_col, "categoria": cat_col,
                "descripcion": desc_col, "stock_minimo": min_stock_col
            }.items() if v}

            for _, row in df.iterrows():
                name_val = row.get(name_col)
                if pd.isna(name_val) or str(name_val).strip() == "": continue
                
                cat_val = row.get(cat_col) if cat_col else "General"
                if pd.isna(cat_val) or str(cat_val).strip() == "": cat_val = "General"
                
                desc_val = row.get(desc_col) if desc_col else ""
                if pd.isna(desc_val): desc_val = ""

                item = {
                    "name": str(name_val).strip(),
                    "barcode": clean_barcode(row.get(barcode_col)) if barcode_col else None,
                    "cost": clean_number(row.get(cost_col)) if cost_col else 0,
                    "price": clean_number(row.get(price_col)) if price_col else 0,
                    "stock": clean_number(row.get(stock_col)) if stock_col else 0,
                    "category_name": str(cat_val).strip().title(),
                    "description": str(desc_val).strip()[:300] if desc_val else "",
                    "min_stock": clean_number(row.get(min_stock_col)) if min_stock_col else 5,
                }
                parsed_items.append(item)
                
                if len(parsed_items) >= 500: break
            
            if len(parsed_items) >= 500: break
            
        return jsonify({
            "items": parsed_items,
            "sheet_info": sheet_info,
            "columns_detected": columns_detected
        }), 200

    except Exception as e:
        print("Error parsing excel:", str(e))
        import traceback; traceback.print_exc()
        return jsonify({"msg": "Error al procesar el archivo. Asegúrate de que no esté vacío o corrupto."}), 500

@api.route('/inventory/confirm', methods=['POST'])
@jwt_required()
def confirm_inventory():
    from app import app
    claims = get_jwt()
    business_id = claims.get('business_id')
    if not business_id:
        return jsonify({"msg": "Missing business_id in token"}), 401

    data = request.json
    if not data or 'items' not in data:
        return jsonify({"msg": "No items provided"}), 400
        
    items = data['items']
    inserted_products_data = []
    
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
            if barcode is None or str(barcode).strip().lower() in ('', 'nan', 'none', 'null', 'n/a'):
                barcode = None
            else:
                barcode = str(barcode).strip()
                # Remove trailing .0 from float-parsed barcodes
                if barcode.endswith('.0'):
                    barcode = barcode[:-2]
                if not barcode:
                    barcode = None
                
            # Create the Product
            product = Product(
                business_id=business_id,
                name=item.get('name', 'Producto Desconocido'),
                price=int(item.get('price', 0)),
                stock=int(item.get('stock', 0)),
                barcode=barcode,
                category=category.name,
                description=item.get('description', '')[:300] if item.get('description') else None,
                min_stock=int(item.get('min_stock', 5))
            )
            db.session.add(product)
            db.session.flush() # Need flush to get the id for the background task
            
            inserted_products_data.append({
                "id": product.id,
                "name": product.name
            })

        db.session.commit()
        
        # Fire background task to fetch images
        if inserted_products_data:
            app_context = app.app_context()
            thread = threading.Thread(
                target=process_images_in_background,
                args=(app_context, inserted_products_data)
            )
            thread.daemon = True
            thread.start()
            
        return jsonify({"msg": f"Se insertaron {len(items)} productos con éxito, imágenes descargándose en segundo plano."}), 201
        
    except Exception as e:
        db.session.rollback()
        print("Error confirming bulk import:", str(e))
        return jsonify({"msg": "Error interno al guardar los productos"}), 500

# ─────────────────────────────────────────────
# PROMOTIONS endpoints
# ─────────────────────────────────────────────

@api.route('/promotions', methods=['GET'])
def get_promotions():
    business_id = request.args.get('business_id', type=int)
    if not business_id:
        return jsonify({"msg": "Missing business_id query param"}), 400
    from api.models import Promotion
    promotions = Promotion.query.filter_by(business_id=business_id).order_by(Promotion.id.desc()).all()
    # Serialize promotions but adapt them so they look like 'Products' to the POS
    results = []
    for promo in promotions:
        results.append({
            "is_promotion": True,
            "id": f"promo_{promo.id}", # virtual ID to avoid clashing with products
            "real_promo_id": promo.id,
            "business_id": promo.business_id,
            "name": promo.name,
            "price": promo.price,
            "barcode": promo.barcode,
            "category": "Promociones",
            "image_url": "https://ui-avatars.com/api/?name=Pack&background=FFD700&color=000&size=200", 
            "stock": 999, # Pack stock depends on its items, handled at checkout
            "items": [item.serialize() for item in promo.items]
        })
    return jsonify(results), 200

@api.route('/promotions', methods=['POST'])
@jwt_required()
def create_promotion():
    claims = get_jwt()
    business_id = claims.get('business_id')
    if not business_id:
        return jsonify({"msg": "Missing business_id in token"}), 401

    data = request.json
    if not data or 'name' not in data or 'price' not in data or 'items' not in data:
        return jsonify({"msg": "Missing required fields: name, price, items"}), 400

    items_data = data['items']
    if len(items_data) == 0:
        return jsonify({"msg": "Promotion must have at least one product"}), 400

    from api.models import Promotion, PromotionItem
    import random

    # Check if barcode already exists for another promotion, or generate one
    barcode = data.get('barcode')
    if barcode and str(barcode).strip():
        barcode = str(barcode).strip()
        existing = Promotion.query.filter_by(business_id=business_id, barcode=barcode).first()
        if existing:
            return jsonify({"msg": "Esa caja/código de barras ya está asignada a otra promoción."}), 400
    else:
        # Auto-generate a unique barcode
        while True:
            # Generate a 13 digit number, starting with 9 to pseudo-identify it locally
            barcode = "9" + "".join([str(random.randint(0, 9)) for _ in range(12)])
            existing = Promotion.query.filter_by(business_id=business_id, barcode=barcode).first()
            if not existing:
                break

    new_promo = Promotion(
        business_id=business_id,
        name=data['name'],
        price=float(data['price']),
        barcode=barcode
    )
    db.session.add(new_promo)
    db.session.flush()

    for item in items_data:
        promo_item = PromotionItem(
            promotion_id=new_promo.id,
            product_id=item['product_id'],
            quantity=item.get('quantity', 1)
        )
        db.session.add(promo_item)

    db.session.commit()
    return jsonify({"msg": "Promoción creada con éxito", "promotion": new_promo.serialize()}), 201

@api.route('/promotions/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_promotion(id):
    from api.models import Promotion
    claims = get_jwt()
    business_id = claims.get('business_id')

    promo = Promotion.query.filter_by(id=id, business_id=business_id).first()
    if not promo:
        return jsonify({"msg": "Promotion not found"}), 404

    # The relationship cascade defined in models.py deletes PromotionItems automatically
    db.session.delete(promo)
    db.session.commit()
    return jsonify({"msg": "Promoción eliminada"}), 200
