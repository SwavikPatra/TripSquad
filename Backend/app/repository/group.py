from uuid import UUID
from sqlalchemy.orm import Session
from app.models.group_models import Group, GroupMember, MembershipRole
from fastapi import HTTPException, status, Response
from fastapi.responses import JSONResponse
from app.api.schemas.group import AddMembersRequest
from app.models.user_models import User

class GroupRepo:
    def create_group(
    self,
    db: Session,
    name: str,
    created_by: UUID,
    description: str = None
    ) -> Group:
        try:
            group_data = {
                "name": name,
                "description": description,
                "created_by": created_by
            }
            
            db_group = Group(**group_data)
            db.add(db_group)
            db.commit()
            db.refresh(db_group)
            return db_group
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
    
    async def add_group_members(self, db: Session, group_id: UUID, group_members: AddMembersRequest):
        """
        Adds multiple members to a group with validation checks, skipping existing members.
        
        Args:
            db: SQLAlchemy session
            group_id: UUID of the group
            group_members: AddMembersRequest object containing user_ids and role
            
        Returns:
            Tuple: (success_count: int, skipped_count: int, error_messages: List[str])
        """
        # First check if group exists
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group with ID {group_id} does not exist"
            )

        success_count = 0
        skipped_count = 0
        error_messages = []
        members_to_add = []

        for user_id in group_members.user_ids:
            try:
                # Check if user exists
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    error_messages.append(f"User with ID {user_id} does not exist")
                    continue

                # Check if user is already in the group
                existing_member = db.query(GroupMember).filter(
                    GroupMember.group_id == group_id,
                    GroupMember.user_id == user_id
                ).first()

                if existing_member:
                    skipped_count += 1
                    continue

                # If all checks pass, prepare member for addition
                members_to_add.append(
                    GroupMember(
                        group_id=group_id,
                        user_id=user_id,
                        role=group_members.role
                    )
                )
                success_count += 1

            except Exception as e:
                error_messages.append(f"Error processing user {user_id}: {str(e)}")

        try:
            if members_to_add:  # Only commit if there are members to add
                db.add_all(members_to_add)
                db.commit()
            
            return {
                "success_count": success_count,
                "skipped_count": skipped_count,
                "error_messages": error_messages
            }

        except Exception as e:
            db.rollback()
            error_messages.append(f"Database error while adding members: {str(e)}")
            return {
                "success_count": 0,
                "skipped_count": skipped_count,
                "error_messages": error_messages
            }
    async def get_group_members(self, db: Session, group_id: UUID):
        """
        Fetch all members of a group with their details
        
        Args:
            db: SQLAlchemy session
            group_id: UUID of the group
            
        Returns:
            List of group members with their roles
            or error message if group doesn't exist
        """
        # Check if group exists
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return {
                'status': 'error',
                'message': f'Group {group_id} does not exist',
                'data': None
            }
        
        # Fetch all members with their user details
        members = db.query(
            GroupMember,
            User.username,
            User.email
        ).join(
            User, GroupMember.user_id == User.id
        ).filter(
            GroupMember.group_id == group_id
        ).all()
        
        # Format the response
        members_data = [{
            'user_id': str(member.GroupMember.user_id),
            'username': member.username,
            'email': member.email,
            'role': member.GroupMember.role,
        } for member in members]
        
        return {
            'status': 'success',
            'message': f'Found {len(members_data)} members',
            'data': members_data
        }
    
    async def delete_group(self, group_id, current_user, db):
        group = db.query(Group).filter(Group.id == group.id).first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        if group.created_by != current_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permissions to delete this Group."
            )
        try:
            db.delete(group)
            db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
    
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Deletion failed: {str(e)}"
            )
    def count_group_admins(
    self,
    db: Session,
    group_id: UUID
    ) -> int:
        """Count how many admins a group has"""
        return db.query(GroupMember).filter_by(
            group_id=group_id,
            role=MembershipRole.ADMIN
        ).count()

    def get_oldest_member(
        self,
        db: Session,
        group_id: UUID
    ) -> GroupMember | None:
        """Get the oldest (by join date) non-admin member"""
        return db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.role != MembershipRole.ADMIN
        ).order_by(
            GroupMember.joined_at.asc()
        ).first()

    def update_member_role(
        self,
        db: Session,
        group_id: UUID,
        user_id: UUID,
        new_role: MembershipRole
    ) -> bool:
        """Update a member's role"""
        membership = db.query(GroupMember).filter_by(
            group_id=group_id,
            user_id=user_id
        ).first()
        
        if not membership:
            return False
            
        membership.role = new_role
        db.commit()
        return True
grouprepo = GroupRepo()
    