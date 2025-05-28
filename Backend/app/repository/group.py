from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.models.group_models import Group, GroupMember, MembershipRole, GroupInvite, JoinRequest, InviteStatus
from fastapi import HTTPException, status, Response
from fastapi.responses import JSONResponse
from app.api.schemas.group import AddMembersRequest, GroupJoinRequestOut
from app.models.user_models import User
from datetime import datetime, timezone

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
    
    def is_user_group_admin(
        self,
        db: Session,
        group_id: UUID,
        current_user : UUID,
    ):
        
        user_role = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user
        ).first()
        print(f"admin check: {user_role.role}")

        return True if user_role.role == 'admin' else False

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

    def get_group_by_id(self, db: Session, group_id: UUID) -> Group:
        return db.query(Group).filter(Group.id == group_id).first()

    def is_user_group_member(self, db: Session, group_id: UUID, user_id: UUID) -> bool:
        return db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first() is not None
    
    def get_or_create_group_secret(self, db: Session, group_id: UUID, current_user: UUID) -> str:
        """Get existing active secret, refresh if expired, or create new one"""
        # Try to get existing invite
        db_invite = db.query(GroupInvite).filter(
            GroupInvite.group_id == group_id,
            GroupInvite.is_active == True
        ).first()
        print(f"db invite: {db_invite}")
        
        # Case 1: Found active unexpired invite
        if db_invite and db_invite.expires_at > datetime.now(timezone.utc):
            return db_invite.secret_code
        print('after if')
        
        # Case 2: Found expired invite - refresh it
        if db_invite:
            try:
                db_invite.refresh_code()
                db.commit()
                return db_invite.secret_code
            except Exception as e:
                db.rollback()
                raise Exception(f"Failed to refresh invite: {str(e)}")
        
        # Case 3: No existing invite - create new
        new_invite = GroupInvite(
            group_id=group_id,
            created_by=current_user,
            is_active=True
        )
        
        try:
            db.add(new_invite)
            db.commit()
            return new_invite.secret_code
        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to create invite: {str(e)}")
    
    def join_group_request(
            self,
            db: Session,
            current_user: UUID,
            secret_code: str,
    ):
        try:
            requested_to_join = db.query(JoinRequest).filter(JoinRequest.user_id== current_user).first()
            if requested_to_join:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You already have requested to join."
                )
            secret_code_check = db.query(GroupInvite).filter(GroupInvite.secret_code == secret_code).first()
            if not secret_code_check:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invite id entry not found."
                )
            join_request_data = JoinRequest(
                invite_id = secret_code_check.secret_code,
                user_id = current_user,
                group_id = secret_code_check.group_id,
                status = 'PENDING',
            )
            db.add(join_request_data)
            db.commit()
            db.refresh(join_request_data)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to created group invite entry: {str(e)}"
            )
    def get_group_join_requests(
        self,
        db: Session,
        group_id: UUID,
        current_user_id: UUID,
    ) -> List[GroupJoinRequestOut]:
        try:
            join_requests = db.query(JoinRequest,User.id, User.username, User.email).join(User, User.id == JoinRequest.user_id).filter(JoinRequest.group_id == group_id, JoinRequest.status == InviteStatus.PENDING).all()
            return [
                GroupJoinRequestOut(
                    user_id=id,
                    user_name=username, 
                    email=email
                ) 
                for (_, id, username, email) in join_requests]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No join requests pending.",
            )
    def approve_join_requests(
        self, 
        user_id: UUID,
        group_id: UUID,
        current_user_id: UUID,
        db: Session,
    ):
        try:
            # Get the specific join request for this user and group
            join_request = db.query(JoinRequest).filter(
                JoinRequest.user_id == user_id,
                JoinRequest.group_id == group_id,
                JoinRequest.status == InviteStatus.PENDING
            ).first()
            
            if not join_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Only admin can reject group join requests."
                )

            # Create new group member
            new_member = GroupMember(
                group_id=group_id,
                user_id=user_id,
                role=MembershipRole.MEMBER
            )

            # Update join request status
            join_request.status = InviteStatus.APPROVED
            join_request.processed_at = func.now()
            join_request.processed_by = current_user_id

            db.add(new_member)
            db.commit()
            db.refresh(new_member)
            
            return True
        
        except HTTPException:
            raise  # Re-raise HTTPExceptions
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unable to add new member: {str(e)}"
            )
    def reject_join_requests(
        self, 
        user_id: UUID,
        group_id: UUID,
        current_user_id: UUID,
        db: Session,
    ):
        try:
            # Get the specific join request for this user and group
            join_request = db.query(JoinRequest).filter(
                JoinRequest.user_id == user_id,
                JoinRequest.group_id == group_id,
                JoinRequest.status == InviteStatus.PENDING
            ).first()
            
            if not join_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Only admin can reject group join requests."
                )
            join_request.status = InviteStatus.REJECTED
            join_request.processed_at = func.now()
            join_request.processed_by = current_user_id
            db.commit()
            db.refresh(join_request)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to reject the join request: {str(e)}"
            )
    
    def promote_to_admin(
        self,
        db: Session,
        group_id: UUID,
        user_id: UUID
    ):
        try:
            group_member = db.query(GroupMember).filter(
                GroupMember.group_id == group_id, 
                GroupMember.user_id == user_id
            ).first()
            if not group_member:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="The member is not the member of this group."
                )
            group_member.role = MembershipRole.ADMIN
            db.commit()
            db.refresh(group_member)
            return True
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while promoting user to admin: {str(e)}"
            )

    
        
        


grouprepo = GroupRepo()
    