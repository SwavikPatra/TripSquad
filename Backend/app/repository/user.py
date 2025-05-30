from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi import status, HTTPException
from uuid import UUID
from collections import defaultdict
from app.models.group_models import Group, GroupMember
from app.models.expense_models import UserBalance
from app.models.user_models import User

class UserRepo:
    def get_user_balances(
        self,
        current_user_id: UUID,
        db: Session
    ):
        group_ids = [g.group_id for g in db.query(GroupMember.group_id).filter_by(
            user_id=current_user_id
        ).all()]

        if not group_ids:
            return []

        # 2. Get all relevant balances (both directions)
        balances = db.query(UserBalance).filter(
            UserBalance.group_id.in_(group_ids),
            (UserBalance.debtor_id == current_user_id) | 
            (UserBalance.creditor_id == current_user_id)
        ).all()

        # 3. Calculate net amounts per user per group
        net_balances = defaultdict(lambda: defaultdict(float))
        
        for b in balances:
            if b.debtor_id == current_user_id:
                other_user = b.creditor_id
                net_balances[b.group_id][other_user] -= b.amount  # You owe
            else:
                other_user = b.debtor_id
                net_balances[b.group_id][other_user] += b.amount  # They owe

        # 4. Fetch all needed names in 2 queries
        user_ids = {uid for group in net_balances.values() for uid in group.keys()}
        users = {u.id: u.username for u in db.query(User.id, User.username).filter(
            User.id.in_(user_ids)
        ).all()}

        groups = {g.id: g.name for g in db.query(Group.id, Group.name).filter(
            Group.id.in_(group_ids)
        ).all()}

        # 5. Format response
        balance_data = []
        for group_id, user_balances in net_balances.items():
            for other_user_id, amount in user_balances.items():
                if amount == 0:  # Skip settled balances
                    continue
                    
                balance_data.append({
                    "group_name": groups[group_id],
                    "other_user_name": users[other_user_id],
                    "net_amount": abs(amount),
                    "direction": "owes_you" if amount > 0 else "you_owe"
                })

        return balance_data
    def get_user_net_balances_in_group(
        self,
        group_id: UUID,
        current_user: UUID,
        db: Session
    ):
        try:
            # 1. Verify user is in this group
            if not db.query(GroupMember).filter_by(
                group_id=group_id,
                user_id=current_user
            ).first():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You're not a member of this group"
                )

            # 2. Get all relevant balances in this group
            balances = db.query(UserBalance).filter(
                UserBalance.group_id == group_id,
                (UserBalance.debtor_id == current_user) | 
                (UserBalance.creditor_id == current_user)
            ).all()

            # 3. Calculate net amounts per user
            net_balances = defaultdict(float)
            
            for b in balances:
                if b.debtor_id == current_user:
                    other_user = b.creditor_id
                    net_balances[other_user] -= b.amount  # You owe
                else:
                    other_user = b.debtor_id
                    net_balances[other_user] += b.amount  # They owe

            # 4. Fetch usernames in one query
            user_ids = list(net_balances.keys())
            users = {u.id: u.username for u in db.query(User.id, User.username).filter(
                User.id.in_(user_ids)
            ).all()}

            # 5. Format response (skip zero balances)
            balance_data =  [{
                "other_user_name": users[user_id],
                "net_amount": abs(amount),
                "direction": "owes_you" if amount > 0 else "you_owe"
            } for user_id, amount in net_balances.items() if amount != 0]

            return balance_data
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to load user balance for this grop: {str(e)}"
            )
    def get_user_groups(
            self,
            user_id: UUID,
            db: Session,
    ):
        try:
            memberships = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
            if not memberships:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="You don't have any Groups yet."
                )
            return memberships
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while retriving user groups: {str(e)}"
            )

userrepo = UserRepo()