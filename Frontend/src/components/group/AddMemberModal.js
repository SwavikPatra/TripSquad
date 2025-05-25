import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { addGroupMembers } from '../../services/api/group_api';

const AddMemberModal = ({ isOpen, onClose, onSubmit, groupId }) => {
  const [userIds, setUserIds] = useState(['']);
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddUserIdField = () => {
    setUserIds([...userIds, '']);
  };

  const handleRemoveUserIdField = (index) => {
    if (userIds.length > 1) {
      const newUserIds = userIds.filter((_, i) => i !== index);
      setUserIds(newUserIds);
    }
  };

  const handleUserIdChange = (index, value) => {
    const newUserIds = [...userIds];
    newUserIds[index] = value;
    setUserIds(newUserIds);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty user IDs
    const validUserIds = userIds.filter(id => id.trim() !== '');
    
    if (validUserIds.length === 0) {
      setError('Please enter at least one user ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const memberData = {
        user_ids: validUserIds,
        role: role
      };

      const response = await addGroupMembers(groupId, memberData);
      
      // Handle the response
      if (response.success_count > 0 || response.skipped_count > 0) {
        // Reset form
        setUserIds(['']);
        setRole('member');
        
        // Call parent callback
        if (onSubmit) {
          await onSubmit(memberData);
        }
        
        // Show success message if there were any errors or skips
        if (response.error_messages.length > 0 || response.skipped_count > 0) {
          let message = '';
          if (response.success_count > 0) {
            message += `Successfully added ${response.success_count} member(s). `;
          }
          if (response.skipped_count > 0) {
            message += `${response.skipped_count} member(s) were already in the group. `;
          }
          if (response.error_messages.length > 0) {
            message += `Errors: ${response.error_messages.join(', ')}`;
          }
          setError(message);
        }
      } else {
        setError(response.error_messages.join(', ') || 'Failed to add members');
      }
      
    } catch (err) {
      console.error('Failed to add members:', err);
      setError(err.message || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setUserIds(['']);
      setRole('member');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Add Members</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {/* User IDs */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User IDs
            </label>
            <div className="space-y-2">
              {userIds.map((userId, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => handleUserIdChange(index, e.target.value)}
                    placeholder="Enter user ID"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  {userIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveUserIdField(index)}
                      disabled={loading}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddUserIdField}
              disabled={loading}
              className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
            >
              <Plus size={16} className="mr-1" />
              Add another user ID
            </button>
          </div>

          {/* Role */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add Members'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;