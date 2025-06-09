from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from uuid import UUID
from typing import Optional
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.api.schemas.itineraries import ItineraryRequest, ItineraryEntryUpdate
from app.api.schemas.auth import UserData 
from app.models.group_models import Group
from app.models.itineraries_model import ItineraryEntry
from app.models.user_models import User
from app.core.aws import s3_client
from app.core.config import settings
from botocore.exceptions import ClientError
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/itineraries")

@router.post("/groups/{group_id}/itinerary")
def itinerary(
    entry_data: ItineraryRequest,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    new_entry = ItineraryEntry(
        title=entry_data.title,
        description=entry_data.description,
        day_number=entry_data.day_number,
        google_maps_link=entry_data.google_maps_link,  # This will be None if not provided
        group_id=entry_data.group_id,
        created_by=current_user.id,
        )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

# Get api to get a specific itineraries

@router.get("/itinerary-entries/{entry_id}")
def get_itinerary_entry(entry_id: UUID, db: Session = Depends(get_db)):
    entry_data = (
        db.query(
            ItineraryEntry.id,
            ItineraryEntry.title,
            ItineraryEntry.description,
            ItineraryEntry.day_number,
            ItineraryEntry.google_maps_link,
            User.username.label("creator_name")
        )
        .join(User, User.id == ItineraryEntry.created_by)
        .filter(ItineraryEntry.id == entry_id)
        .first()
    )
    
    if not entry_data:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return {
        "id": entry_data.id,
        "title": entry_data.title,
        "description": entry_data.description,
        "day_number": entry_data.day_number,
        "google_maps_link": entry_data.google_maps_link,
        "creator_name": entry_data.creator_name
    }

@router.patch("/itinerary-entries/{entry_id}")
def update_itinerary_entry(
    entry_id: UUID,
    entry_data: ItineraryEntryUpdate,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """
    Update an itinerary entry by ID.
    
    - Only the creator can update the entry
    - Partial updates allowed (PATCH semantics)
    - Fields not provided will remain unchanged
    """
    entry = db.query(ItineraryEntry).filter(ItineraryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary entry not found"
        )
    
    if entry.created_by != current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this entry"
        )
    
    # Update only the fields that were provided
    if entry_data.title is not None:
        entry.title = entry_data.title
    if entry_data.description is not None:
        entry.description = entry_data.description
    if entry_data.day_number is not None:
        entry.day_number = entry_data.day_number
    if entry_data.google_maps_link is not None:
        entry.google_maps_link = entry_data.google_maps_link
    
    db.commit()
    db.refresh(entry)
    
    return entry

@router.delete("/itinerary-entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_itinerary_entry(
    entry_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """
    Delete an itinerary entry by ID.
    
    - Only the creator or group admin can delete an entry
    - Also deletes all attachments (due to cascade delete)
    """
    entry = db.query(ItineraryEntry).filter(ItineraryEntry.id == entry_id).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary entry not found"
        )
    
    # Check if current user is the creator or has admin rights
    # You'll need to implement your own permission checking logic
    if entry.created_by != current_user.id:
        # Add group admin check here if needed
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this entry"
        )
    
    db.delete(entry)
    db.commit()
    
    return "Itinerary deleted."



@router.put("/groups/{group_id}/itineraries/{itinerary_id}/location")
async def update_itinerary_location(
    group_id: UUID,
    itinerary_id: UUID,
    google_maps_link: Optional[str] = None,  # Set to `null` to remove
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate group and itinerary ownership
    entry = db.query(ItineraryEntry).filter_by(
        id=itinerary_id,
        group_id=group_id,
        created_by=current_user.id  # Only creator can modify
    ).first()
    if not entry:
        raise HTTPException(404, "Entry not found or unauthorized")
    
    entry.google_maps_link = google_maps_link
    db.commit()
    return {"status": "Location updated"}

@router.get("/groups/{group_id}/itineraries/{itinerary_id}/location")
async def get_itinerary_location(
    group_id: UUID,
    itinerary_id: UUID,
    db: Session = Depends(get_db)
):
    entry = db.query(ItineraryEntry).filter_by(
        id=itinerary_id,
        group_id=group_id
    ).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    
    return {"google_maps_link": entry.google_maps_link}

@router.delete("/groups/{group_id}/itineraries/{itinerary_id}/location")
async def clear_itinerary_location(
    group_id: UUID,
    itinerary_id: UUID,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validate entry exists and user has permissions
    entry = db.query(ItineraryEntry).filter_by(
        id=itinerary_id,
        group_id=group_id,
        created_by=current_user.id  # Only creator can modify
    ).first()
    if not entry:
        raise HTTPException(404, "Entry not found or unauthorized")
    
    # 2. Clear location (set to None)
    entry.google_maps_link = None
    db.commit()
    
    return {"status": "Location cleared"}

# Upload files to s3
@router.post("/groups/{group_id}/itineraries/{itinerary_id}/file")
def upload_file(
    group_id: str,
    itinerary_id: str,
    file: UploadFile = File(...),
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Upload file to S3
        s3_client.upload_fileobj(
            file.file,
            settings.S3_BUCKET_NAME,
            file.filename,
            ExtraArgs={
                'ContentType': file.content_type
            }
        )
        
        # Verify the file exists in S3
        s3_client.head_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=file.filename
        )
                # Generate public URL (if bucket is public)
        file_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_DEFAULT_REGION}.amazonaws.com/{file.filename}"
        
        return JSONResponse(
            status_code=200, 
            content={
                "status": "success",
                "filename": file.filename,
                "content_type": file.content_type,
                "s3_url": file_url,
                "bucket": settings.S3_BUCKET_NAME,
                "message": "File successfully uploaded to S3"
            }
        )
        
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"S3 Error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload Error: {str(e)}"
        )