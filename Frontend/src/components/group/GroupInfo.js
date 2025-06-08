import React from 'react';
import { Image, FileText, Upload } from 'lucide-react';

const GroupInfo = ({ group, loading }) => {
  if (loading) {
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
      {/* Images Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <Image className="w-5 h-5 mr-2" />
            Group Images
          </h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm flex items-center transition-colors">
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </button>
        </div>
        
        {/* Image Grid Placeholder */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
          <Image className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No images uploaded yet</p>
          <p className="text-gray-400 text-xs mt-1">Click upload to add group photos</p>
        </div>
      </div>

      {/* Documents Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Documents
          </h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm flex items-center transition-colors">
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </button>
        </div>
        
        {/* Documents List Placeholder */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors h-full min-h-[200px] flex flex-col justify-center">
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No documents uploaded yet</p>
          <p className="text-gray-400 text-xs mt-1">Share important documents with your group</p>
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;