import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, MapPin, User, Plus, Crown, Trash2, MoreVertical } from 'lucide-react';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest, getGroupMembers, removeGroupMember, updateMemberRole } from '../../services/api/group_api';
import AddMemberModal from './AddMemberModal';

const GroupInfoModal = ({ isOpen, onClose, group, groupMembers }) => {
  const [copied, setCopied] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  // States for members functionality
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Initialize members from props
  useEffect(() => {
    if (groupMembers && Array.isArray(groupMembers)) {
      setMembers(groupMembers);
    }
  }, [groupMembers]);

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

  // Functions for members functionality
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
    if (!members.length) {
      fetchMembers();
    }
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
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.member-menu')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Group Information</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Group Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Group Name</h3>
                <p className="text-gray-600">{group?.name || 'No name available'}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600">{group?.description || 'No description available'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Created Date
                  </h3>
                  <p className="text-gray-600">
                    {group?.created_at ? new Date(group.created_at).toLocaleDateString() : 'Not available'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location
                  </h3>
                  <p className="text-gray-600">{group?.location || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Created By
                </h3>
                <p className="text-gray-600">{group?.created_by || 'Not available'}</p>
              </div>
            </div>

            {/* Admin Controls Section */}
            {group?.is_current_user_admin && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Admin Controls</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleShowJoinRequests}
                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Join Requests
                  </button>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Member
                  </button>
                </div>
              </div>
            )}

            {/* Group Invite Code */}
            {group?.secret_code && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Group Invite Code</h3>
                <div
                  className="px-4 py-3 bg-yellow-100 text-yellow-800 font-mono rounded cursor-pointer hover:bg-yellow-200 transition text-center font-bold text-lg"
                  onClick={handleCopy}
                  title="Click to copy"
                >
                  {group.secret_code}
                </div>
                {copied && (
                  <div className="text-sm text-green-600 mt-2 text-center">
                    Copied to clipboard!
                  </div>
                )}
                <p className="text-sm text-yellow-700 mt-2 text-center">
                  Share this code with others to let them join your group
                </p>
              </div>
            )}

            {/* Group Members */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Members ({members?.length || 0})
                </h3>
                <button
                  onClick={handleShowMembers}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  View All Members
                </button>
              </div>
              
              {/* Show first few members as preview */}
              {members && members.length > 0 ? (
                <div className="space-y-2">
                  {members.slice(0, 3).map((member, index) => (
                    <div key={member.id || index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        {member.name ? member.name.charAt(0).toUpperCase() : member.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{member.name || member.username || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{member.email || 'No email'}</p>
                      </div>
                      {member.role && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {member.role}
                        </span>
                      )}
                      {member.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500 ml-2" />
                      )}
                    </div>
                  ))}
                  {members.length > 3 && (
                    <div className="text-center py-2">
                      <span className="text-sm text-gray-500">
                        And {members.length - 3} more members...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No members found</p>
              )}
            </div>

            {/* Additional Group Details */}
            {group?.additional_info && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Additional Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(group.additional_info, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Members Modal */}
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
                {group?.is_current_user_admin && (
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Member
                  </button>
                )}
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
                          {group?.is_current_user_admin && (
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

      {/* Join Requests Modal */}
      {showJoinRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
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
        groupId={group?.id}
      />
    </>
  );
};

export default GroupInfoModal;