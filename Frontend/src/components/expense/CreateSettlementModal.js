import React, { useState, useEffect } from 'react';
import { X, IndianRupee, Users } from 'lucide-react';

const CreateSettlementModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  groupId, 
  groupMembers = [],
  currentUserId,
  loading = false, 
  error = null 
}) => {
  const [formData, setFormData] = useState({
    paid_to: '',
    amount: '',
    note: ''
  });
  const [formError, setFormError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        paid_to: '',
        amount: '',
        note: ''
      });
      setFormError('');
    }
  }, [isOpen]);

  // Filter out current user from the members list
  const availableMembers = groupMembers.filter(member => member.id !== currentUserId);

  // Debug logging
  console.log('Group Members:', groupMembers);
  console.log('Current User ID:', currentUserId);
  console.log('Available Members:', availableMembers);
  useEffect(() => {
  console.log("DEBUG: groupMembers", groupMembers);
}, [groupMembers]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear form error when user starts typing
    if (formError) setFormError('');
  };

  const validateForm = () => {
    if (!formData.paid_to) {
      setFormError('Please select a member to pay to');
      return false;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid amount greater than 0');
      return false;
    }
    
    if (!formData.note.trim()) {
      setFormError('Please provide a note for this settlement');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await onSubmit({
        paid_to: formData.paid_to,
        amount: parseFloat(formData.amount),
        note: formData.note.trim()
      });
      
      // Form will be reset by useEffect when modal closes
    } catch (err) {
      // Error handling is done by parent component
      console.error('Settlement creation failed:', err);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <IndianRupee className="w-5 h-5 mr-2 text-green-600" />
            Create Settlement
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Display */}
          {(error || formError) && (
            <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
              {error || formError}
            </div>
          )}

          {/* Pay To Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Pay To
            </label>
            <select
              name="paid_to"
              value={formData.paid_to}
              onChange={handleInputChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50"
              required
            >
              <option value="">
                {availableMembers.length === 0 
                  ? 'No members available' 
                  : 'Select a member'
                }
              </option>
            {availableMembers.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.name || member.username || 'Unknown'}
              {member.email ? ` (${member.email})` : ''}
            </option>
          ))}

            </select>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <IndianRupee className="w-4 h-4 inline mr-1" />
              Amount (₹)
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              disabled={loading}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50"
              required
            />
          </div>

          {/* Note Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              disabled={loading}
              placeholder="Reason for this settlement..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 resize-none"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.paid_to || !formData.amount || !formData.note.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <IndianRupee className="w-4 h-4 mr-2" />
                  Create Settlement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSettlementModal;