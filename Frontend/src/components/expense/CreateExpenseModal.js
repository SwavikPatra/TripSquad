import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { getGroupMembers } from '../../services/api/group_api';
import { createExpense } from '../../services/api/expense_api'; // Adjust import path as needed
import { FaIndianRupeeSign } from "react-icons/fa6";


const CreateExpenseModal = ({ isOpen, onClose, onSubmit, groupId, loading, error }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_amount: '',
    split_type: 'equal'
  });
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [customSplits, setCustomSplits] = useState({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Load group members when modal opens
  useEffect(() => {
    if (isOpen && groupId) {
      loadGroupMembers();
    }
  }, [isOpen, groupId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const loadGroupMembers = async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      const response = await getGroupMembers(groupId);
      
      if (response.status === 'success') {
        setMembers(response.data || []);
      } else {
        setMembersError(response.message || 'Failed to load members');
      }
    } catch (err) {
      console.error('Failed to load members:', err);
      setMembersError(err.message || 'Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      total_amount: '',
      split_type: 'equal'
    });
    setSelectedMembers(new Set());
    setCustomSplits({});
    setValidationErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleMemberToggle = (memberId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
      // Remove custom split if member is deselected
      const newCustomSplits = { ...customSplits };
      delete newCustomSplits[memberId];
      setCustomSplits(newCustomSplits);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleCustomSplitChange = (memberId, amount) => {
    setCustomSplits(prev => ({
      ...prev,
      [memberId]: parseFloat(amount) || 0
    }));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      errors.total_amount = 'Total amount must be greater than 0';
    }
    
    if (selectedMembers.size === 0) {
      errors.members = 'Please select at least one member';
    }
    
    // Validate custom splits
    if (formData.split_type === 'custom') {
      const totalAmount = parseFloat(formData.total_amount);
      let customTotal = 0;
      
      for (const memberId of selectedMembers) {
        const splitAmount = customSplits[memberId] || 0;
        if (splitAmount <= 0) {
          errors.customSplits = 'All custom split amounts must be greater than 0';
          break;
        }
        customTotal += splitAmount;
      }
      
      if (!errors.customSplits && Math.abs(customTotal - totalAmount) > 0.01) {
        errors.customSplits = `Custom splits total (${customTotal.toFixed(2)}) must equal total amount (${totalAmount.toFixed(2)})`;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const totalAmount = parseFloat(formData.total_amount);
    const selectedCount = selectedMembers.size;
    
    // Prepare splits based on split type
    const splits = Array.from(selectedMembers).map(memberId => {
      let amount;
      if (formData.split_type === 'equal') {
        amount = totalAmount / selectedCount;
      } else {
        amount = customSplits[memberId] || 0;
      }
      
      return {
        user_id: memberId,
        amount: amount
      };
    });

    const expenseData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      total_amount: totalAmount,
      split_type: formData.split_type,
      splits: splits
    };

    try {
      await onSubmit(expenseData);
      resetForm();
    } catch (err) {
      // Error handling is managed by parent component
      console.error('Error creating expense:', err);
    }
  };

  if (!isOpen) return null;

  const totalAmount = parseFloat(formData.total_amount) || 0;
  const selectedCount = selectedMembers.size;
  const equalSplitAmount = selectedCount > 0 ? totalAmount / selectedCount : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FaIndianRupeeSign className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Create Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Expense Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter expense title"
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter expense description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount *
                </label>
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.total_amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {validationErrors.total_amount && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.total_amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split Type
                </label>
                <select
                  name="split_type"
                  value={formData.split_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equal">Equal Split</option>
                  <option value="custom">Custom Split</option>
                </select>
              </div>
            </div>

            {/* Members Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Members *
              </label>
              
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading members...</span>
                </div>
              ) : membersError ? (
                <div className="p-3 text-red-700 bg-red-100 border border-red-400 rounded">
                  {membersError}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {members.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No members found</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleMemberToggle(member.user_id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-colors ${
                              selectedMembers.has(member.user_id)
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {selectedMembers.has(member.user_id) && (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <div>
                            <span className="font-medium text-gray-800">{member.username}</span>
                            <span className="text-sm text-gray-500 ml-2">{member.email}</span>
                          </div>
                        </div>
                        
                        {selectedMembers.has(member.user_id) && (
                          <div className="flex items-center text-sm">
                            {formData.split_type === 'equal' ? (
                              <span className="text-green-600 font-medium">
                                ₹{equalSplitAmount.toFixed(2)}
                              </span>
                            ) : (
                              <input
                                type="number"
                                value={customSplits[member.user_id] || ''}
                                onChange={(e) => handleCustomSplitChange(member.user_id, e.target.value)}
                                step="0.01"
                                min="0"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0.00"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {validationErrors.members && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.members}</p>
              )}
              {validationErrors.customSplits && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.customSplits}</p>
              )}
            </div>

            {/* Summary */}
            {selectedCount > 0 && totalAmount > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Members:</span>
                    <span className="font-medium">{selectedCount}</span>
                  </div>
                  {formData.split_type === 'equal' && (
                    <div className="flex justify-between">
                      <span>Amount per person:</span>
                      <span className="font-medium">₹{equalSplitAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || selectedCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Expense'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateExpenseModal;