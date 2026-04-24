from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()


class Business(db.Model):
    """Represents a minimarket / business tenant."""
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)  # short identifier e.g. "minimarket-pedro"
    subscription_plan: Mapped[str] = mapped_column(String(50), nullable=False, server_default="basico")

    # Business details
    rut = db.Column(String(20), nullable=True)              # e.g. "76.123.456-7"
    giro_comercial = db.Column(String(200), nullable=True)  # e.g. "Venta de abarrotes"
    address = db.Column(String(300), nullable=True)         # physical address
    phone = db.Column(String(30), nullable=True)            # contact phone
    contact_email = db.Column(String(120), nullable=True)   # business contact email
    is_active = db.Column(db.Boolean, nullable=False, server_default="true")

    # API Billing Credentials (Encrypted)
    billing_api_key = db.Column(db.String(500), nullable=True) 
    billing_branch_name = db.Column(db.String(120), nullable=True)
    billing_pos_name = db.Column(db.String(120), nullable=True)
    logo_url = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    users = db.relationship("User", backref="business", lazy=True)
    categories = db.relationship("Category", backref="business", lazy=True)
    products = db.relationship("Product", backref="business", lazy=True)
    promotions = db.relationship("Promotion", backref="business", lazy=True)
    orders = db.relationship("Order", backref="business", lazy=True)
    cash_sessions = db.relationship("CashSession", backref="business", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "subscription_plan": self.subscription_plan,
            "rut": self.rut,
            "giro_comercial": self.giro_comercial,
            "address": self.address,
            "phone": self.phone,
            "contact_email": self.contact_email,
            "is_active": self.is_active if self.is_active is not None else True,
            "billing_branch_name": self.billing_branch_name,
            "billing_pos_name": self.billing_pos_name,
            # We DON'T serialize the API key for security unless specifically requested, 
            # or we serialize it as a flag.
            "has_billing_key": True if self.billing_api_key else False,
            "logo_url": self.logo_url,
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
            "business": self.business.serialize() if self.business else None,
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
    cost_price = db.Column(db.Float, nullable=True, default=None)  # precio de costo

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
            "cost_price": self.cost_price,
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
    
    # Billing/SII Integration Fields
    sii_document_type = db.Column(db.Integer, nullable=True)  # e.g., 39 (Boleta), 33 (Factura)
    sii_folio = db.Column(db.Integer, nullable=True)          # Official folio number
    sii_pdf_url = db.Column(String(255), nullable=True)       # URL to the PDF receipt/boleta
    sii_status = db.Column(String(50), nullable=True, default="pending") # pending, accepted, rejected, offline
    sii_signed_xml = db.Column(db.Text, nullable=True)        # Full signed DTE XML
    sii_ted_xml = db.Column(db.Text, nullable=True)           # TED (Timbre Electrónico DTE) XML

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
            "sii_document_type": self.sii_document_type,
            "sii_folio": self.sii_folio,
            "sii_pdf_url": self.sii_pdf_url,
            "sii_status": self.sii_status,
            "sii_signed_xml": self.sii_signed_xml,
            "sii_ted_xml": self.sii_ted_xml,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.serialize() for item in self.items]
        }


class OrderItem(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(db.ForeignKey('order.id'), nullable=False)
    product_id: Mapped[int] = mapped_column(db.ForeignKey('product.id'), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=1)
    price_at_time: Mapped[float] = mapped_column(nullable=False)
    is_promo: Mapped[bool] = mapped_column(db.Boolean, nullable=False, default=False, server_default=db.text('false'))

    product = db.relationship("Product", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "price_at_time": self.price_at_time,
            "is_promo": self.is_promo,
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


class Promotion(db.Model):
    """A promotional pack consisting of multiple products."""
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(db.ForeignKey("business.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[float] = mapped_column(nullable=False)
    barcode: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    # Barcode is unique within a business
    __table_args__ = (
        UniqueConstraint("business_id", "barcode", name="uq_promotion_business_barcode"),
    )

    items = db.relationship("PromotionItem", backref="promotion", lazy=True, cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "price": self.price,
            "barcode": self.barcode,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.serialize() for item in self.items]
        }


class PromotionItem(db.Model):
    """A product and its quantity within a promotional pack."""
    id: Mapped[int] = mapped_column(primary_key=True)
    promotion_id: Mapped[int] = mapped_column(db.ForeignKey("promotion.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(db.ForeignKey("product.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False, default=1)

    product = db.relationship("Product", lazy=True)

    def serialize(self):
        return {
            "id": self.id,
            "promotion_id": self.promotion_id,
            "product_id": self.product_id,
            "quantity": self.quantity,
            "product": self.product.serialize() if self.product else None
        }