import React from 'react';

const GroupInfo = ({ group, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Group Information</h2>
      <div className="space-y-3">
        <div>
          <span className="font-medium text-gray-600">Name:</span>
          <span className="ml-2 text-gray-800">{group.name}</span>
        </div>
        {group.description && (
          <div>
            <span className="font-medium text-gray-600">Description:</span>
            <p className="ml-2 text-gray-800 mt-1">{group.description}</p>
          </div>
        )}
        {group.created_at && (
          <div>
            <span className="font-medium text-gray-600">Created:</span>
            <span className="ml-2 text-gray-800">
              {new Date(group.created_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupInfo;