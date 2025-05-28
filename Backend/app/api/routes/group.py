from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.schemas.auth import UserData 
from app.core.auth import get_current_user
from app.core.database import get_db
from app.helper.group_helper import grouphelper
from uuid import UUID
from app.repository.group import grouprepo
from app.models.group_models import GroupMember, GroupAttachment, AttachmentType, MembershipRole
from app.api.schemas.group import AddMembersRequest, CreateGroupRequest, GroupResponse, JoinGroupRequestIn, ApproveJoinRequest
from app.models.itineraries_model import ItineraryEntry
from app.models.user_models import User
from app.core.aws import upload_file_to_s3, delete_file_from_s3, generate_presigned_url



router = APIRouter(prefix="/group")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_group(
    request: CreateGroupRequest,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    try:
        # Use repository pattern
        db_group = grouprepo.create_group(
            db=db,
            name=request.name,
            description=request.description,
            created_by=current_user.id
        )
        
        # Add creator of the group as default admin
        request = AddMembersRequest(
            user_ids=[current_user.id],
            role="admin"
        )
        await grouprepo.add_group_members(db, db_group.id, request)
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "status": "success",
                "message": "Group created successfully",
                "data": {
                    "group_id": str(db_group.id),
                    "name": db_group.name
                }
            }
        )
    
    except HTTPException as he:
        raise he
        
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Failed to create group: {str(e)}"
            }
        )

@router.get("/{group_id}", status_code=status.HTTP_200_OK)
async def get_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    try:
        # Check if user is a member of the group
        
        if not grouprepo.is_user_group_member(db, group_id, current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this group"
            )
        
        # Get group details
        db_group = grouprepo.get_group_by_id(db, group_id)
        if not db_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
                # Get or create secret code (only for group admins)
        secret_code = None
        is_current_user_admin = False
        if grouprepo.is_user_group_admin(db, group_id, current_user.id):
            is_current_user_admin = True
        if is_current_user_admin:
            secret_code = grouprepo.get_or_create_group_secret(db, group_id, current_user.id)
        print(f'secret code: {secret_code}')
        
        # Convert to response model
        print('before group response')
        group_response = GroupResponse(
            id=db_group.id,
            name=db_group.name,
            description=db_group.description,
            created_by=db_group.created_by,
            created_at=db_group.created_at.isoformat() if db_group.created_at else None,
            updated_at=db_group.updated_at.isoformat() if db_group.updated_at else None,
            secret_code=secret_code,
            is_current_user_admin=is_current_user_admin
        )
        
        return group_response
    
    except HTTPException as he:
        raise he
        
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Failed to retrieve group: {str(e)}"
            }
        )


@router.post("/{group_id}/members")
async def add_members(
    group_id: UUID,
    request: AddMembersRequest,
    db: Session = Depends(get_db)
):
    return await grouprepo.add_group_members(db, group_id, request)

@router.get("/{group_id}/members")
async def get_members(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    return await grouprepo.get_group_members(db, group_id)

# Delete group member
@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_200_OK)
async def remove_group_member(
    group_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove a member from a group
    - Admins can remove any member
    - Members can only remove themselves
    - If admin removes themselves, promotes oldest member to admin
    - Returns 200 on success
    """
    try:
        # Verify the requester is either admin or removing themselves
        is_admin = grouprepo.is_group_admin(db, group_id, current_user.id)
        is_self_removal = (user_id == current_user.id)

        if not (is_admin or is_self_removal):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or the member themselves can remove members"
            )

        # Check if we're removing the last admin
        removing_last_admin = False
        if is_admin and is_self_removal:
            admin_count = grouprepo.count_group_admins(db, group_id)
            removing_last_admin = (admin_count == 1)

        # Perform the removal
        removed = grouprepo.remove_group_member(db, group_id, user_id)
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found in group"
            )

        # Handle admin succession if needed
        if removing_last_admin:
            oldest_member = grouprepo.get_oldest_member(db, group_id)
            if oldest_member:
                grouprepo.update_member_role(
                    db, 
                    group_id, 
                    oldest_member.user_id, 
                    MembershipRole.ADMIN
                )

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "message": "Member removed successfully",
                "data": {
                    "group_id": str(group_id),
                    "removed_user_id": str(user_id),
                    "new_admin_id": str(oldest_member.user_id) if removing_last_admin and oldest_member else None
                }
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing member: {str(e)}"
        )

# List all the itenary that are created inside a group.

@router.get("/{group_id}/itinerary-entries/")
def get_itinerary_entries_by_group(
    group_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all itineraries BELONGING TO A SPECIFIC GROUP"""
    entries = (
        db.query(
            ItineraryEntry.id,
            ItineraryEntry.title,
            ItineraryEntry.day_number,
            User.username.label("creator_name")
        )
        .join(User, User.id == ItineraryEntry.created_by)
        .filter(ItineraryEntry.group_id == group_id)  # 👈 Critical filter
        .order_by(ItineraryEntry.day_number.asc())  # Optional: sort by day
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return [{
        "id": entry.id,
        "title": entry.title,
        "day_number": entry.day_number,
        "creator_name": entry.creator_name
    } for entry in entries]

# attachments

@router.post("/attachments", status_code=status.HTTP_201_CREATED)
async def upload_group_attachment(
    group_id: UUID,
    file: UploadFile = File(...),
    attachment_type: AttachmentType = AttachmentType.MEDIA,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    try:
        content = await file.read()
        file_name, file_url = upload_file_to_s3(content, file.filename, file.content_type)

        attachment = GroupAttachment(
            group_id=group_id,
            original_filename=file.filename,
            file_url=file_url,
            s3_key=file_name,
            attachment_type=attachment_type
        )
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        return {"message": "File uploaded successfully", "attachment_id": attachment.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attachments")
def list_attachments(
    group_id: UUID,
    attachment_type: Optional[AttachmentType] = None,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    query = db.query(GroupAttachment).filter(GroupAttachment.group_id == group_id)
    if attachment_type:
        query = query.filter(GroupAttachment.attachment_type == attachment_type)
    attachments = query.all()

    return [
        {
            "id": attachment.id,
            "filename": attachment.original_filename,
            "type": attachment.attachment_type,
            "uploaded_at": attachment.uploaded_at
        } for attachment in attachments
    ]


@router.get("/attachments/{attachment_id}")
def get_presigned_url_for_attachment(
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    attachment = db.query(GroupAttachment).filter(GroupAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    try:
        s3_key = attachment.file_url.split("/")[-1]
        presigned_url = generate_presigned_url(s3_key)
        return {
            "filename": attachment.original_filename,
            "url": presigned_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    attachment = db.query(GroupAttachment).filter(GroupAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    try:
        delete_file_from_s3(attachment.s3_key)
        db.delete(attachment)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_group(
    group_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a group
    - Returns 204 No Content on success
    - Returns 403 if user is not the creator
    - Returns 404 if group doesn't exist
    """
    await grouprepo.delete_group(
        group_id=group_id,
        current_user=current_user.id,  # or current_user if your function expects the full user object
        db=db
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/join")
def join_group_request(
    request: JoinGroupRequestIn,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    secret_code = request.secret_code
    if not secret_code:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Secret code is needed to join a group."
        )
    try:
        grouprepo.join_group_request(db, current_user.id, secret_code)
        return "Group Join request successfully sent."
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error while sending group join request: {str(e)}"
        )

@router.get("/{group_id}/join-requests")
def get_join_requests(
    group_id: UUID,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not grouprepo.is_user_group_admin(db, group_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can see the group join requests."
        )
    return grouprepo.get_group_join_requests(db, group_id, current_user.id)

@router.post("/approve-join-requests")
def approve_join_requests(
    request: ApproveJoinRequest,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group_id = request.group_id
    if not grouprepo.is_user_group_admin(db, group_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can see the group join requests."
        )
    grouprepo.approve_join_requests(
        user_id=request.user_id,
        group_id=request.group_id,
        current_user_id=current_user.id,
        db=db,
    )
    return {"message": "User's group join request accepted successfully."}

@router.put("/reject-join-requests")
def reject_join_requests(
    request: ApproveJoinRequest,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group_id = request.group_id
    if not grouprepo.is_user_group_admin(db, group_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can see the group join requests."
        )
    grouprepo.reject_join_requests(
        user_id=request.user_id,
        group_id=request.group_id,
        current_user_id=current_user.id,
        db=db,
    )
    return {"message": "User's group join request rejected successfully."}

@router.patch("/{group_id}/admins/{user_id}/role")
def grant_admin_role(
    group_id: UUID,
    user_id: UUID,  # From URL
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not grouprepo.is_user_group_admin(db, group_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign admin roles"
        )

    # Business logic to promote user
    grouprepo.promote_to_admin(db, group_id, user_id)
    
    return {"message": f"User {user_id} promoted to admin successfully"}