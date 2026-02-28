from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)


    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<Category {self.name}>'

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name
        }

class Product(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[float] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_url: Mapped[str] = mapped_column(String(250), nullable=True)
    stock: Mapped[int] = mapped_column(nullable=False, default=0)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "category": self.category,
            "image_url": self.image_url,
            "stock": self.stock
        }

class Order(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    total_price: Mapped[float] = mapped_column(nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    items = db.relationship("OrderItem", backref="order", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "total_price": self.total_price,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.serialize() for item in self.items]
        }

class OrderItem(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(db.ForeignKey('order.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(db.ForeignKey('product.id'), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=1)
    price_at_time: Mapped[float] = mapped_column(nullable=False)
    
    product = db.relationship("Product", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "price_at_time": self.price_at_time,
            "product": self.product.serialize() if self.product else None
        }