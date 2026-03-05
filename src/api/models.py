from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()


class Business(db.Model):
    """Represents a minimarket / business tenant."""
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)  # short identifier e.g. "minimarket-pedro"
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    users = db.relationship("User", backref="business", lazy=True)
    categories = db.relationship("Category", backref="business", lazy=True)
    products = db.relationship("Product", backref="business", lazy=True)
    orders = db.relationship("Order", backref="business", lazy=True)
    cash_sessions = db.relationship("CashSession", backref="business", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class User(db.Model):
    """A user (admin or cashier) belonging to a business."""
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(db.ForeignKey("business.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(120), nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="cashier")  # admin | cashier
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    # Email is unique within a business, not globally
    __table_args__ = (
        UniqueConstraint("business_id", "email", name="uq_user_business_email"),
    )

    orders = db.relationship("Order", backref="user", lazy=True)
    cash_sessions = db.relationship("CashSession", backref="user", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "business_name": self.business.name if self.business else "",
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active
        }


class Category(db.Model):
    """Product category scoped to a business."""
    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("business.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    # Name is unique within a business
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_category_business_name"),
    )

    def __repr__(self):
        return f'<Category {self.name}>'

    def serialize(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name
        }


class Product(db.Model):
    """A product belonging to a business."""
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(db.ForeignKey("business.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[float] = mapped_column(nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_url: Mapped[str] = mapped_column(String(250), nullable=True)
    stock: Mapped[int] = mapped_column(nullable=False, default=0)
    barcode: Mapped[str] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(String(300), nullable=True)
    min_stock: Mapped[int] = mapped_column(nullable=False, default=5)

    # Barcode is unique within a business (same barcode can exist in different businesses)
    __table_args__ = (
        UniqueConstraint("business_id", "barcode", name="uq_product_business_barcode"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "price": self.price,
            "category": self.category,
            "image_url": self.image_url,
            "stock": self.stock,
            "barcode": self.barcode,
            "description": self.description,
            "min_stock": self.min_stock,
            "low_stock": self.stock <= self.min_stock
        }


class Order(db.Model):
    """A sale order, associated to a business and the cashier who made it."""
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(db.ForeignKey("business.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(db.ForeignKey("user.id"), nullable=True)  # nullable for legacy data
    total_price: Mapped[float] = mapped_column(nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="cash")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    items = db.relationship("OrderItem", backref="order", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "total_price": self.total_price,
            "status": self.status,
            "payment_method": self.payment_method,
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


class CashSession(db.Model):
    """A daily cash register session for a business, opened/closed by a user."""
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(db.ForeignKey("business.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(db.ForeignKey("user.id"), nullable=True)  # who opened/closed
    date: Mapped[str] = mapped_column(String(20), nullable=False)   # Format: YYYY-MM-DD
    starting_cash: Mapped[float] = mapped_column(nullable=False)
    counted_cash: Mapped[float] = mapped_column(nullable=False)
    counted_card: Mapped[float] = mapped_column(nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    # Date is unique per business (one closing per day per business)
    __table_args__ = (
        UniqueConstraint("business_id", "date", name="uq_cashsession_business_date"),
    )

    def serialize(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "user_id": self.user_id,
            "date": self.date,
            "starting_cash": self.starting_cash,
            "counted_cash": self.counted_cash,
            "counted_card": self.counted_card,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }