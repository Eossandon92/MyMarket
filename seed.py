import os
from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set up the SQLAlchemy connection
# Important: SQLAlchemy needs 'postgresql://' not 'postgres://'
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://estebanossandon:Somela2005@localhost:5432/mymarket")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Import models from our application
from src.api.models import Product, Order, OrderItem, User

def seed_data():
    # 1. Crear Productos de Prueba
    products_data = [
        {"name": "Coca Cola 3L", "price": 2500, "category": "Bebidas", "stock": 20, "image_url": "https://www.coca-cola.com/content/dam/journey/us/en/brands/coca-cola/coca-cola-original-taste/coca-cola-original-taste-20-oz-bottle.png"},
        {"name": "Papas Lays Clásicas", "price": 1200, "category": "Snacks", "stock": 15, "image_url": "https://m.media-amazon.com/images/I/81vJyb43URL._SL1500_.jpg"},
        {"name": "Leche Soprole Entera 1L", "price": 950, "category": "Lácteos", "stock": 30, "image_url": "https://jumbo.vtexassets.com/arquivos/ids/621111/Leche-entera-Soprole-1-L.jpg?v=638063345472870000"},
        {"name": "Pan Hallulla (1kg)", "price": 2000, "category": "Panadería", "stock": 10, "image_url": "https://mandolin.cl/wp-content/uploads/2020/06/pan-hallulla.jpg"},
        {"name": "Queso Gouda Laminado (250g)", "price": 2800, "category": "Lácteos", "stock": 12, "image_url": "https://doffice.cl/wp-content/uploads/2020/09/queso-laminado-gouda.jpg"},
        {"name": "Galletas Tritón", "price": 800, "category": "Snacks", "stock": 25, "image_url": "https://www.lider.cl/catalogo/images/puntosDeContacto/000000000000001004.jpg"},
        {"name": "Cerveza Escudo (Lata 470cc)", "price": 1000, "category": "Bebidas", "stock": 50, "image_url": "https://jumbo.vtexassets.com/arquivos/ids/530510/Cerveza-Escudo-lata-470-cc.jpg?v=637775949540000000"},
        {"name": "Manzana Fuji (1kg)", "price": 1500, "category": "Frutas", "stock": 40, "image_url": "https://www.frutas-hortalizas.com/img/fru_horta/126_manzana_fuji.jpg"}
    ]

    print("Limpiando la base de datos...")
    session.query(OrderItem).delete()
    session.query(Order).delete()
    session.query(Product).delete()
    session.query(User).delete()
    session.commit()
    
    print("Agregando productos...")
    db_products = []
    for item in products_data:
        product = Product(
            name=item["name"],
            price=item["price"],
            category=item["category"],
            stock=item["stock"],
            image_url=item["image_url"]
        )
        session.add(product)
        db_products.append(product)
    
    session.commit()
    print(f"✅ {len(db_products)} Productos agregados.")

if __name__ == '__main__':
    seed_data()
    print("¡Base de datos sembrada con éxito!")

