import React, { useState } from 'react';
import { Users, Plus, Crown, Trash2, MoreVertical } from 'lucide-react';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest, getGroupMembers, removeGroupMember, updateMemberRole } from '../../services/api/group_api';
import AddMemberModal from './AddMemberModal';

const GroupInfo = ({ group, loading }) => {
  const [copied, setCopied] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  // New states for members functionality
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      setJoinRequests(prev => prev.filter(req => req.user_id !== userId));
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (userId) => {
    setProcessingRequest(userId);
    try {
      await rejectJoinRequest(group.id, userId);
      setJoinRequests(prev => prev.filter(req => req.user_id !== userId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  // New functions for members functionality
  const fetchMembers = async () => {
    setLoadingMembers(true);
    setMembersError(null);
    try {
      const response = await getGroupMembers(group.id);
      
      if (response.status === 'success') {
        setMembers(response.data || []);
      } else {
        setMembersError(response.message || 'Failed to load members');
        setMembers([]);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
      setMembersError(err.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleShowMembers = () => {
    setShowMembers(true);
    fetchMembers();
  };

  const handleMenuToggle = (memberId) => {
    setOpenMenuId(openMenuId === memberId ? null : memberId);
  };

  const handleMakeAdmin = async (member) => {
    try {
      setActionLoading(true);
      setOpenMenuId(null);
      await updateMemberRole(group.id, member.user_id, 'admin');
      await fetchMembers(); // Reload members
    } catch (err) {
      console.error('Failed to make admin:', err);
      setMembersError(err.message || 'Failed to update member role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.username} from the group?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setOpenMenuId(null);
      await removeGroupMember(group.id, member.user_id);
      await fetchMembers(); // Reload members
    } catch (err) {
      console.error('Failed to remove member:', err);
      setMembersError(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    await fetchMembers(); // Reload members after adding
    setShowAddMemberModal(false);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.member-menu')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

          {/* Members Section - New */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleShowMembers}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              View Members
            </button>
          </div>
          
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

      {/* Members Modal - New */}
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Group Members</h3>
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                  {members.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Member
                </button>
                <button
                  onClick={() => setShowMembers(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-80">
              {/* Error display */}
              {membersError && (
                <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded text-sm">
                  {membersError}
                </div>
              )}

              {loadingMembers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading members...</span>
                </div>
              ) : members.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No members found</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.user_id} className="relative">
                      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-700">
                              {member.username?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium text-gray-800">{member.username}</span>
                              {member.role === 'admin' && (
                                <Crown className="w-4 h-4 text-yellow-500 ml-2" />
                              )}
                            </div>
                            <span className="text-sm text-gray-500">{member.email}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="text-sm text-gray-500 capitalize mr-2">
                            {member.role}
                          </div>
                          {group.is_current_user_admin && (
                            <div className="relative member-menu">
                              <button
                                onClick={() => handleMenuToggle(member.user_id)}
                                disabled={actionLoading}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {openMenuId === member.user_id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                  <div className="py-1">
                                    {member.role !== 'admin' && (
                                      <button
                                        onClick={() => handleMakeAdmin(member)}
                                        disabled={actionLoading}
                                        className="w-full flex items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        <Crown className="w-4 h-4 mr-3 text-yellow-500" />
                                        Make Admin
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemoveMember(member)}
                                      disabled={actionLoading}
                                      className="w-full flex items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                      <Trash2 className="w-4 h-4 mr-3" />
                                      Remove Member
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSubmit={handleAddMember}
        groupId={group.id}
      />
    </>
  );
};

export default GroupInfo;