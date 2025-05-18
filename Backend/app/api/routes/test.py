from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.responses import JSONResponse
import boto3
from botocore.exceptions import ClientError
from app.core.aws import s3_client
from app.core.config import settings

router = APIRouter()


@router.post("/itenary")
def upload_file(
    file: UploadFile = File(...)
):
    """
    Test endpoint for uploading files to S3.
    Returns success/failure status with file details.
    """
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
