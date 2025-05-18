import boto3
import uuid
from app.core.config import settings
from botocore.exceptions import NoCredentialsError, ClientError

AWS_ACCESS_KEY_ID = settings.AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY = settings.AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION = settings.AWS_DEFAULT_REGION
S3_BUCKET_NAME = settings.S3_BUCKET_NAME


s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_DEFAULT_REGION
)

# Upload file to S3 and return URL
def upload_file_to_s3(file_content, original_filename, content_type):
    try:
        file_name = f"{uuid.uuid4()}_{original_filename}"  # Store original name as part of the file key
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=file_name,
            Body=file_content,
            ContentType=content_type
        )
        file_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{file_name}"
        return file_name, file_url
    except ClientError as e:
        raise Exception(f"Error uploading file: {str(e)}")

# Delete file from S3
def delete_file_from_s3(file_name):
    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=file_name)
    except ClientError as e:
        raise Exception(f"Error deleting file: {str(e)}")

# Generate a pre-signed URL for file access
def generate_presigned_url(file_name, expiration=3600):
    try:
        response = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': file_name},
            ExpiresIn=expiration
        )
        return response
    except ClientError as e:
        raise Exception(f"Error generating pre-signed URL: {str(e)}")