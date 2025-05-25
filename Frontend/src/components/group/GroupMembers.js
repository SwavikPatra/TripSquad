import React, { useState, useEffect } from 'react';
import { Plus, Crown, Trash2, Users, MoreVertical } from 'lucide-react';
import { getGroupMembers, removeGroupMember, updateMemberRole } from '../../services/api/group_api';
import AddMemberModal from './AddMemberModal';

const GroupMembers = ({ groupId, group }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load members on component mount
  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getGroupMembers(groupId);
      
      if (response.status === 'success') {
        setMembers(response.data || []);
      } else {
        setError(response.message || 'Failed to load members');
        setMembers([]);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
      setError(err.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuToggle = (memberId) => {
    setOpenMenuId(openMenuId === memberId ? null : memberId);
  };

  const handleMakeAdmin = async (member) => {
    try {
      setActionLoading(true);
      setOpenMenuId(null);
      await updateMemberRole(groupId, member.user_id, 'admin');
      await loadMembers(); // Reload members
    } catch (err) {
      console.error('Failed to make admin:', err);
      setError(err.message || 'Failed to update member role');
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
      await removeGroupMember(groupId, member.user_id);
      await loadMembers(); // Reload members
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    // This will be handled by the AddMemberModal
    await loadMembers(); // Reload members after adding
    setShowAddModal(false);
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Users className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Members</h3>
          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {members.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Member
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {/* Members list */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {members.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No members found
          </div>
        ) : (
          members.map((member) => (
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
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMember}
        groupId={groupId}
      />
    </div>
  );
};

export default GroupMembers;