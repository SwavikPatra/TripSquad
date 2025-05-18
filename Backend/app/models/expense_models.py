import enum
from sqlalchemy import Enum as SQLEnum, Float, Text
from sqlalchemy import Column, String, DateTime, UUID, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class SplitType(enum.Enum):
    EQUAL = "equal"
    CUSTOM = "custom"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    total_amount = Column(Float, nullable=False)
    split_type = Column(SQLEnum(SplitType), nullable=False, default=SplitType.EQUAL)
    created_at = Column(DateTime, default=datetime.utcnow)

    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete")
    attachments = relationship("Attachment", back_populates="expense", cascade="all, delete")

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    amount = Column(Float, nullable=False)  # Exact amount owed

    expense = relationship("Expense", back_populates="splits")
    settlements = relationship("Settlement", back_populates="expense_split", cascade="all, delete-orphan")


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id"), nullable=False)
    paid_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    paid_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    amount = Column(Float, nullable=False)
    settled_at = Column(DateTime, default=datetime.utcnow)
    note = Column(Text, nullable=True)

    expense_split = relationship("ExpenseSplit", back_populates="settlements", passive_deletes=True)


class UserBalance(Base):
    # Tracks net balances
    __tablename__ = "user_balances"
    debtor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), primary_key=True) # got the money, will pay
    creditor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), primary_key=True) # had paid the money, will receive
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    amount = Column(Float, nullable=False)  # Positive = debtor owes creditor

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255))
    file_url = Column(String, nullable=False)  # File path or URL
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    expense = relationship("Expense", back_populates="attachments")
