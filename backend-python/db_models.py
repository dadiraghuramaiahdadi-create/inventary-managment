import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="STAFF")  # ADMIN, MANAGER, STAFF
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "fullName": self.full_name,
            "role": self.role,
            "enabled": self.enabled,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None
        }


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None
        }


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(100), nullable=True)
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    lead_time_days = Column(Integer, default=7, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    products = relationship("Product", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contactPerson": self.contact_person,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "leadTimeDays": self.lead_time_days,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None
        }


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), index=True, nullable=False)
    description = Column(String(500), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    cost_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=False, default=0.0)
    quantity = Column(Integer, nullable=False, default=0)
    reorder_level = Column(Integer, nullable=False, default=10)
    unit = Column(String(20), nullable=False, default="PCS")
    image_url = Column(String(500), nullable=True)
    barcode = Column(String(100), nullable=True)
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    transactions = relationship("StockTransaction", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("PurchaseOrderItem", back_populates="product", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku,
            "name": self.name,
            "description": self.description or "",
            "categoryId": self.category_id,
            "categoryName": self.category.name if self.category else "Uncategorized",
            "supplierId": self.supplier_id,
            "supplierName": self.supplier.name if self.supplier else "N/A",
            "costPrice": round(float(self.cost_price), 2),
            "sellingPrice": round(float(self.selling_price), 2),
            "quantity": int(self.quantity),
            "reorderLevel": int(self.reorder_level),
            "unit": self.unit or "PCS",
            "imageUrl": self.image_url or "",
            "barcode": self.barcode or self.sku,
            "lowStock": (self.quantity <= self.reorder_level and self.quantity > 0),
            "outOfStock": (self.quantity <= 0),
            "version": self.version,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() + "Z" if self.updated_at else None
        }


class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    transaction_type = Column(String(20), nullable=False)  # IN, OUT, ADJUSTMENT, PO_RECEIVE
    quantity_changed = Column(Integer, nullable=False)
    before_quantity = Column(Integer, nullable=False)
    after_quantity = Column(Integer, nullable=False)
    reference_number = Column(String(100), nullable=True)
    reason = Column(String(255), nullable=True)
    performed_by = Column(String(100), nullable=False, default="SYSTEM")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    product = relationship("Product", back_populates="transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "productId": self.product_id,
            "productName": self.product.name if self.product else "Unknown Product",
            "productSku": self.product.sku if self.product else "N/A",
            "transactionType": self.transaction_type,
            "quantityChanged": self.quantity_changed,
            "beforeQuantity": self.before_quantity,
            "afterQuantity": self.after_quantity,
            "referenceNumber": self.reference_number or "",
            "reason": self.reason or "",
            "performedBy": self.performed_by,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String(20), nullable=False, default="DRAFT")  # DRAFT, PENDING, APPROVED, RECEIVED, CANCELLED
    order_date = Column(Date, nullable=False, default=datetime.date.today)
    expected_delivery_date = Column(Date, nullable=True)
    received_date = Column(Date, nullable=True)
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=False, default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "orderNumber": self.order_number,
            "supplierId": self.supplier_id,
            "supplierName": self.supplier.name if self.supplier else "N/A",
            "status": self.status,
            "orderDate": self.order_date.isoformat() if self.order_date else None,
            "expectedDeliveryDate": self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            "receivedDate": self.received_date.isoformat() if self.received_date else None,
            "subtotal": round(float(self.subtotal), 2),
            "taxAmount": round(float(self.tax_amount), 2),
            "totalAmount": round(float(self.total_amount), 2),
            "notes": self.notes or "",
            "createdBy": self.created_by,
            "createdAt": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() + "Z" if self.updated_at else None,
            "items": [item.to_dict() for item in self.items]
        }


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity_ordered = Column(Integer, nullable=False, default=1)
    quantity_received = Column(Integer, nullable=False, default=0)
    unit_price = Column(Float, nullable=False, default=0.0)
    line_total = Column(Float, nullable=False, default=0.0)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def to_dict(self):
        return {
            "id": self.id,
            "productId": self.product_id,
            "productName": self.product.name if self.product else "Unknown Product",
            "productSku": self.product.sku if self.product else "N/A",
            "unit": self.product.unit if self.product else "PCS",
            "quantityOrdered": self.quantity_ordered,
            "quantityReceived": self.quantity_received,
            "unitPrice": round(float(self.unit_price), 2),
            "lineTotal": round(float(self.line_total), 2)
        }
