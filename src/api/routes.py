"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User, Product, Order, OrderItem, Category
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
import os
import requests
from bs4 import BeautifulSoup

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
                        import json
                        try:
                            # It's a JSON string, grab the 'murl'
                            data = json.loads(m_data)
                            image_url = data.get('murl')
                            if image_url and image_url.startswith('http'):
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
    categories = Category.query.order_by(Category.name.asc()).all()
    return jsonify([category.serialize() for category in categories]), 200

@api.route('/categories', methods=['POST'])
def create_category():
    data = request.json
    if not data or 'name' not in data:
        return jsonify({"msg": "Missing category name"}), 400

    # Ensure unique category name (case-insensitive check could be good, but we just try insert)
    existing = Category.query.filter_by(name=data['name'].strip()).first()
    if existing:
        return jsonify({"msg": "Category already exists"}), 400

    new_category = Category(name=data['name'].strip())
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
    products = Product.query.order_by(Product.id.asc()).all()
    return jsonify([product.serialize() for product in products]), 200

@api.route('/products', methods=['POST'])
def create_product():
    data = request.json
    if not data or 'name' not in data or 'price' not in data or 'category' not in data:
        return jsonify({"msg": "Missing required fields: name, price, category"}), 400

    new_product = Product(
        name=data['name'],
        price=data['price'],
        category=data['category'],
        image_url=data.get('image_url', ''),
        stock=data.get('stock', 0)
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

    db.session.commit()
    return jsonify(product.serialize()), 200

@api.route('/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    product = Product.query.get(id)
    if not product:
        return jsonify({"msg": "Product not found"}), 404

    # Warning: In a real POS, you might want to mark it as inactive 
    # instead of deleting it if it already has sales associated.
    # For now, we will perform a hard delete.
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({"msg": "Product deleted successfully"}), 200

@api.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    if not data or 'items' not in data:
        return jsonify({"msg": "No items provided in order"}), 400

    items_data = data['items']
    if not items_data or len(items_data) == 0:
        return jsonify({"msg": "Order must have at least one item"}), 400

    new_order = Order(total_price=0)
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

