import React, { useState, useEffect, useRef } from 'react';
import { Image, FileText, Upload, Download, Trash2, X, Eye, File } from 'lucide-react';
import { uploadGroupAttachment, getGroupAttachments, getAttachmentPresignedUrl, deleteGroupAttachment } from '../../services/api/group_api';

const GroupMediaAttachments = ({ group, loading, groupId }) => {
  const [attachments, setAttachments] = useState({
    media: [],
    documents: []
  });
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [uploading, setUploading] = useState({ media: false, documents: false });
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // Cache for thumbnail URLs
  
  const mediaInputRef = useRef(null);
  const documentInputRef = useRef(null);

  // Load attachments on component mount
  useEffect(() => {
    if (groupId) {
      loadAttachments();
    }
  }, [groupId]);

  // Load thumbnail URLs for media attachments
  useEffect(() => {
    if (attachments.media.length > 0) {
      loadThumbnails();
    }
  }, [attachments.media]);

  const loadAttachments = async () => {
    try {
      setLoadingAttachments(true);
      setError(null);
      
      // Load both media and document attachments
      const [mediaResponse, documentsResponse] = await Promise.all([
        getGroupAttachments(groupId, 'media'),
        getGroupAttachments(groupId, 'document')
      ]);

      setAttachments({
        media: Array.isArray(mediaResponse.data) ? mediaResponse.data : mediaResponse || [],
        documents: Array.isArray(documentsResponse.data) ? documentsResponse.data : documentsResponse || []
      });
    } catch (err) {
      console.error('Failed to load attachments:', err);
      setError('Failed to load attachments');
    } finally {
      setLoadingAttachments(false);
    }
  };

  const loadThumbnails = async () => {
    const thumbnailPromises = attachments.media.map(async (attachment) => {
      try {
        // Skip if we already have the thumbnail URL cached
        if (thumbnailUrls[attachment.id]) {
          return;
        }

        const response = await getAttachmentPresignedUrl(attachment.id);
        const url = response.data?.url || response.url;
        
        if (url) {
          setThumbnailUrls(prev => ({
            ...prev,
            [attachment.id]: url
          }));
        }
      } catch (err) {
        console.error(`Failed to load thumbnail for ${attachment.filename}:`, err);
      }
    });

    await Promise.all(thumbnailPromises);
  };

  const handleFileUpload = async (file, type) => {
    try {
      setUploading(prev => ({ ...prev, [type === 'MEDIA' ? 'media' : 'documents']: true }));
      setError(null);

      await uploadGroupAttachment(groupId, file, type);
      
      // Reload attachments after successful upload
      await loadAttachments();
      
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError(`Failed to upload ${type.toLowerCase()}`);
    } finally {
      setUploading(prev => ({ ...prev, [type === 'MEDIA' ? 'media' : 'documents']: false }));
    }
  };

  const handleMediaUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if it's an image
      if (file.type.startsWith('image/')) {
        handleFileUpload(file, 'MEDIA');
      } else {
        setError('Please select an image file');
      }
    }
  };

  const handleDocumentUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file, 'document');
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await getAttachmentPresignedUrl(attachment.id);
      const url = response.data?.url || response.url;
      
      if (url) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to download file:', err);
      setError('Failed to download file');
    }
  };

  const handleDelete = async (attachmentId, type) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await deleteGroupAttachment(attachmentId);
      
      // Remove from local state
      setAttachments(prev => ({
        ...prev,
        [type]: prev[type].filter(att => att.id !== attachmentId)
      }));

      // Remove thumbnail URL from cache
      if (type === 'media') {
        setThumbnailUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[attachmentId];
          return newUrls;
        });
      }
      
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      setError('Failed to delete attachment');
    }
  };

  const handleImageView = async (attachment) => {
    try {
      // Use cached URL if available, otherwise fetch it
      let url = thumbnailUrls[attachment.id];
      
      if (!url) {
        const response = await getAttachmentPresignedUrl(attachment.id);
        url = response.data?.url || response.url;
      }
      
      if (url) {
        setSelectedImage({ ...attachment, url });
      }
    } catch (err) {
      console.error('Failed to load image:', err);
      setError('Failed to load image');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
    
    if (imageTypes.includes(extension)) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  if (loading || loadingAttachments) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
        <p className="text-gray-500">No group information available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {/* Images Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <Image className="w-5 h-5 mr-2" />
            Group Images ({attachments.media.length})
          </h3>
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={uploading.media}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center transition-colors disabled:opacity-50"
          >
            {uploading.media ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </>
            )}
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*"
            onChange={handleMediaUpload}
            className="hidden"
          />
        </div>
        
        {/* Image Grid */}
        {attachments.media.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
            {attachments.media.map((attachment) => (
              <div key={attachment.id} className="relative group border rounded-lg overflow-hidden bg-gray-100">
                <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
                  {thumbnailUrls[attachment.id] ? (
                    <img
                      src={thumbnailUrls[attachment.id]}
                      alt={attachment.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-full flex items-center justify-center ${thumbnailUrls[attachment.id] ? 'hidden' : 'flex'}`}
                  >
                    <Image className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-500 ml-2 truncate max-w-[80px]">
                      {attachment.filename}
                    </span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleImageView(attachment)}
                      className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(attachment.id, 'media')}
                      className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <p className="text-xs text-gray-600 truncate" title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(attachment.uploaded_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => mediaInputRef.current?.click()}
          >
            <Image className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No images uploaded yet</p>
            <p className="text-gray-400 text-xs mt-1">Click to add group photos</p>
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Documents ({attachments.documents.length})
          </h3>
          <button
            onClick={() => documentInputRef.current?.click()}
            disabled={uploading.documents}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center transition-colors disabled:opacity-50"
          >
            {uploading.documents ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </>
            )}
          </button>
          <input
            ref={documentInputRef}
            type="file"
            onChange={handleDocumentUpload}
            className="hidden"
          />
        </div>
        
        {/* Documents List */}
        {attachments.documents.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {attachments.documents.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center flex-1 min-w-0">
                  {getFileIcon(attachment.filename)}
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                    <p className="text-xs text-gray-500">{formatDate(attachment.uploaded_at)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(attachment.id, 'documents')}
                    className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors h-full min-h-[200px] flex flex-col justify-center cursor-pointer"
            onClick={() => documentInputRef.current?.click()}
          >
            <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No documents uploaded yet</p>
            <p className="text-gray-400 text-xs mt-1">Click to share important documents with your group</p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
              <p className="text-sm font-medium">{selectedImage.filename}</p>
              <p className="text-xs opacity-75">{formatDate(selectedImage.uploaded_at)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMediaAttachments;