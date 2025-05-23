from fastapi import APIRouter, Depends,status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.database import get_db
from app.core.auth import get_current_user
from app.repository.user import userrepo
from app.api.schemas.auth import UserData
from app.api.schemas.user import GroupOut
from typing import List
from app.models.group_models import GroupMember


router = APIRouter(prefix="/user")

@router.get("/balances")
def get_user_balances(
    user_id: UUID,
    db : Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    return userrepo.get_user_balances(
        user_id=user_id,
        db=db,
        current_user=current_user.id
    )

@router.get("/groups/{group_id}/balances")
def get_user_net_balances_in_group(
    group_id: UUID,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns net balances for the current user within a specific group.
    Output: [{
        "other_user_name": str,
        "net_amount": float,  # Positive = they owe you, Negative = you owe them
        "direction": "owes_you" | "you_owe"
    }]
    """
    return userrepo.get_user_net_balances_in_group(group_id, current_user.id, db)


@router.get("/groups")
async def get_user_groups(
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """
    Get all groups that the current user is a member of.
    
    Returns:
    - List of groups with the user's role in each group
    """
    # Query all group memberships for the current user
    memberships =  userrepo.get_user_groups(user_id = current_user.id, db = db )
    
    
    if not memberships:
        return []
    
    # Prepare the response
    groups_with_roles = []
    for membership in memberships:
        group_data = {
            "id": membership.group.id,
            "name": membership.group.name,
            "description": membership.group.description,
            "created_at": membership.group.created_at,
            "role": membership.role.value
        }
        groups_with_roles.append(group_data)
    
    return groups_with_roles
    
    