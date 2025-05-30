from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.expense_models import Expense, Settlement, ExpenseSplit, UserBalance
from app.models.group_models import Group, GroupMember
from app.models.user_models import User
from typing import Optional, List, Dict, Text
from app.api.schemas.expenses import ExpenseResponse

class ExpenseRepo:
    def delete_expense(
        self,
        db: Session,
        group_id : UUID,
        expense_id: UUID,
        current_user_id: UUID
    ) -> bool:
        """Returns True if deleted, False if not found"""
        expense = db.query(Expense).filter(Expense.id==expense_id, Expense.group_id == group_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The expense doesn't exist."
            )
        if expense.created_by != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permissions to delete the expense."
            )
        split = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).all()
        print("printing...31")
        for expense_split in split:  # Each expense_split is an ExpenseSplit object
            user_id = expense_split.user_id  # Access attributes directly
            amount = expense_split.amount
            if user_id != current_user_id:
                balance = db.query(UserBalance).filter(
                    UserBalance.debtor_id == user_id,
                    UserBalance.creditor_id == current_user_id,
                    UserBalance.group_id == group_id
                ).one()
                balance.amount -= amount
        print("printing...40")    
        db.delete(expense)
        db.commit()
        return {"message": "Expense deleted and balances updated"}
    
    def get_group_expenses(
        self,
        db: Session,
        group_id: UUID,
        skip: int = 0,
        limit: int = 100,
        created_by: Optional[UUID] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None
    ) -> List[ExpenseResponse]:
        """
        Retrieve all expenses for a group with optional filters
        """
        query = db.query(Expense).filter(Expense.group_id == group_id)
        
        # Apply filters if provided
        if created_by:
            query = query.filter(Expense.created_by == created_by)
        if min_amount:
            query = query.filter(Expense.total_amount >= min_amount)
        if max_amount:
            query = query.filter(Expense.total_amount <= max_amount)
        
        expenses = query.offset(skip).limit(limit).all()
        print('inside function call 68')
        try:    
            return [
                ExpenseResponse(
                    id=expense.id,
                    title=expense.title,
                    description=expense.description,
                    total_amount=expense.total_amount,
                    created_by=expense.created_by,
                    created_at=expense.created_at,
                    split_type=expense.split_type.value,
                    has_attachments=len(expense.attachments) > 0
                ) for expense in expenses
            ]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"error: {str(e)}"
            )

    def get_expense_by_id(self, db: Session, expense_id: UUID) -> Optional[Expense]:
        """Get raw expense object from database"""
        return db.query(Expense).filter(Expense.id == expense_id).first()

    def get_expense_with_attachments(self, db: Session, expense_id: UUID) -> Dict:
        """Get expense with attached files"""
        expense = db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )
        
        attachments = [
            {
                "id": att.id,
                "filename": att.original_filename,
                "url": att.file_url
            } for att in expense.attachments
        ]
        
        return {
            "expense": expense,
            "attachments": attachments
        }

    def update_expense(
        self,
        db: Session,
        expense_id: UUID,
        update_data: Dict
    ) -> Expense:
        """Pure database update operation"""
        expense = db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        try:
            for field, value in update_data.items():
                setattr(expense, field, value)
            db.commit()
            db.refresh(expense)
            return expense
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

    def get_settlements(
            self,
            db: Session,
            current_user: UUID,
            group_id: UUID,
            paid_by: Optional[UUID] = None,
            paid_to: Optional[UUID] = None,
            skip: int = 0,
            limit: int = None,
    ):
        group = db.query(Group).filter(Group.id==group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The group you want to delete doesnot exist."
            )
        settlements = db.query(Settlement).filter(Settlement.group_id == group_id)
        if paid_by:
            settlements = settlements.filter(Settlement.paid_by == paid_by)
        if paid_to:
            settlements = settlements.filter(Settlement.paid_to == paid_to)
        return settlements.offset(skip).limit(limit).all()
    
    def get_settlement(
        self,
        db: Session,
        settlement_id: UUID,
    ):
        settlement = db.query(Settlement).filter(Settlement.id == settlement_id)
        if not settlement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The settlement you want to find do not exist."
            )
        return settlement.first()
    def get_expense_splits(
        expense_id: UUID,
        db: Session,
        current_user_id: UUID
    ):
        expense = db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found."
            )
        is_member = db.query(GroupMember).filter(
            GroupMember.group_id == expense.group_id,
            GroupMember.user_id == current_user_id
        ).first()
        if not is_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorised to view this expense."
            )
        
        created_by = db.query(
            User.username
        ).filter(
            User.id == expense.created_by
        ).first()

        splits = db.query(
            ExpenseSplit,
            User.username,
        ).join(
            User, ExpenseSplit.user_id == User.id
        ).filter(
            ExpenseSplit.expense_id == expense_id
        ).all()
        
        expense_splits = [
            {
                "expense_id": expense_id,
                "Paid_by": created_by.username,
                "Paid_to" : split.username,
                "amount" : split.ExpenseSplit.amount

            } for split in splits
        ]
        return expense_splits
    
    def get_user_splits_in_group(
            self,
            group_id: UUID,
            user_id: UUID,
            db: Session
    ):
        try:
            participant_splits = db.query(ExpenseSplit)\
                .join(Expense, ExpenseSplit.expense_id == Expense.id)\
                .filter(Expense.group_id == group_id)\
                .filter(ExpenseSplit.user_id == user_id)\
                .all()
        
            # Query expenses where user is the creator (paid money)
            creator_expenses = db.query(Expense)\
                .filter(Expense.group_id == group_id)\
                .filter(Expense.created_by == user_id)\
                .all()
            return (participant_splits, creator_expenses)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Not able to find the splits for the user: {str(e)}"
            )
    
    def create_user_settlement(
        self,
        group_id: UUID,
        paid_by: UUID,
        paid_to: UUID,
        amount: float,
        note: Text,
        db: Session
    ):
        try:
            settlement = Settlement(
                group_id = group_id,
                paid_by = paid_by,
                paid_to = paid_to,
                amount = amount,
                note =  note,
            ) 
            db.add(settlement)
            print(f"group_id: {group_id}, debtor_id: {paid_by}, creditor_id: {paid_to}")
            user_balance = db.query(UserBalance).filter(
                UserBalance.group_id == group_id,
                UserBalance.debtor_id == paid_by,
                UserBalance.creditor_id == paid_to
            ).first()

            if not user_balance:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No previous Balance record found."
                )
            if amount > user_balance.amount:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Amount exceeds debt. Max allowed: {user_balance.amount}"
    )
            user_balance.amount -= amount
            if user_balance.amount == 0:
                db.delete(user_balance)
            else:
                db.add(user_balance)
            db.commit()
            db.refresh(settlement)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while creating a settlement: {str(e)}"
            )
    def delete_user_settlement(
        self, 
        settlement_id: UUID,
        group_id: UUID,
        user_id: UUID,
        db: Session,
    ):
        try:
            settlement = db.query(Settlement).filter(Settlement.id == settlement_id, Settlement.group_id == group_id).first()
            if not settlement:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No settlement found."
                )
            if settlement.paid_by != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not authorised to delete this settlement."
                )
            db.delete(settlement)
            user_balance = db.query(UserBalance).filter(
                UserBalance.group_id == group_id,
                UserBalance.debtor_id == user_id,
                UserBalance.creditor_id == settlement.paid_to
            ).first()
            if not user_balance:
                user_balance = UserBalance(
                    debtor_id = user_id,
                    creditor_id = settlement.paid_to,
                    group_id = group_id,
                    amount = settlement.amount,
                )
            else:
                user_balance.amount += settlement.amount
            db.add(user_balance)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Not able to delete the settlement: {str(e)}"
            )
expenserepo = ExpenseRepo()