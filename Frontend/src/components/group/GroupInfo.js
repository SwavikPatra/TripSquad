import React, { useState } from 'react';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../../services/api/group_api';

const GroupInfo = ({ group, loading }) => {
  const [copied, setCopied] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(group.secret_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const fetchJoinRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await getJoinRequests(group.id);
      setJoinRequests(data);
    } catch (error) {
      console.error('Error fetching join requests:', error);
      // You might want to show a toast notification here
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleShowJoinRequests = () => {
    setShowJoinRequests(true);
    fetchJoinRequests();
  };

  const handleApproveRequest = async (userId) => {
    setProcessingRequest(userId);
    try {
      await approveJoinRequest(group.id, userId);
      // Remove the approved request from the list
      setJoinRequests(prev => prev.filter(req => req.user_id !== userId));
    } catch (error) {
      console.error('Error approving request:', error);
      // You might want to show a toast notification here
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (userId) => {
    setProcessingRequest(userId);
    try {
      await rejectJoinRequest(group.id, userId);
      // Remove the rejected request from the list
      setJoinRequests(prev => prev.filter(req => req.user_id !== userId));
    } catch (error) {
      console.error('Error rejecting request:', error);
      // You might want to show a toast notification here
    } finally {
      setProcessingRequest(null);
    }
  };

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
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-full relative">
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
          {group.secret_code && (
            <div className="relative">
              <span className="font-medium text-gray-600">Group Invite Code:</span>
              <span
                className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 font-mono rounded cursor-pointer hover:bg-yellow-200 transition"
                onClick={handleCopy}
                title="Click to copy"
              >
                {group.secret_code}
              </span>
              {copied && (
                <span className="absolute left-0 mt-2 text-sm text-green-600 bg-green-100 px-2 py-1 rounded shadow animate-fadeInOut">
                  Copied to clipboard!
                </span>
              )}
            </div>
          )}
          
          {/* Admin Controls */}
          {group.is_current_user_admin && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Admin Controls</h3>
              <button
                onClick={handleShowJoinRequests}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Join Requests
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Join Requests Popup */}
      {showJoinRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Join Requests</h3>
              <button
                onClick={() => setShowJoinRequests(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-80">
              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : joinRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending join requests</p>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map((request) => (
                    <div key={request.user_id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-800">
                            {request.user_name || request.username || `User ${request.user_id}`}
                          </p>
                          {request.email && (
                            <p className="text-sm text-gray-600">{request.email}</p>
                          )}
                          {request.requested_at && (
                            <p className="text-xs text-gray-500">
                              Requested: {new Date(request.requested_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRequest(request.user_id)}
                          disabled={processingRequest === request.user_id}
                          className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processingRequest === request.user_id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.user_id)}
                          disabled={processingRequest === request.user_id}
                          className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processingRequest === request.user_id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupInfo;