import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, HandCoins, Calendar, User, FileText, Filter, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { FaIndianRupeeSign } from "react-icons/fa6";
import { getGroupSettlements, getSettlementById, deleteUserSettlement } from '../../services/api/expense_api';

const SettlementsListModal = ({ isOpen, onClose, groupId, groupMembers = [] }) => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [settlementDetails, setSettlementDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [view, setView] = useState('list'); // 'list' or 'details'
  const [filters, setFilters] = useState({
    paid_by: '',
    paid_to: ''
  });

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settlementToDelete, setSettlementToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Helper function to get member name by ID
  const getMemberName = (memberId) => {
    const member = groupMembers.find(m => m.id === memberId || m.user_id === memberId);
    return member ? member.name || member.username || 'Unknown User' : 'Unknown User';
  };

  // Load settlements when modal opens
  useEffect(() => {
    if (isOpen && groupId) {
      loadSettlements();
    }
  }, [isOpen, groupId]);

  const loadSettlements = async (filterParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare filters - only include non-empty values
      const activeFilters = {};
      if (filterParams.paid_by) activeFilters.paid_by = filterParams.paid_by;
      if (filterParams.paid_to) activeFilters.paid_to = filterParams.paid_to;

      const response = await getGroupSettlements(groupId, activeFilters);

      if (response.status === 'Success') {
        setSettlements(response.data || []);
      } else {
        setError('Failed to load settlements');
      }
    } catch (err) {
      console.error('Error loading settlements:', err);
      setError(err.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const loadSettlementDetails = async (settlementId) => {
    try {
      setLoadingDetails(true);
      setError(null);

      const response = await getSettlementById(groupId, settlementId);

      if (response.status === 'Success') {
        setSettlementDetails(response.data);
        setView('details');
      } else {
        setError('Failed to load settlement details');
      }
    } catch (err) {
      console.error('Error loading settlement details:', err);
      setError(err.message || 'Failed to load settlement details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteSettlement = async () => {
    if (!settlementToDelete) return;

    try {
      setDeleting(true);
      setError(null);

      await deleteUserSettlement(groupId, settlementToDelete.id);

      // Close confirmation modal
      setShowDeleteConfirm(false);
      setSettlementToDelete(null);

      // If we're viewing details of the deleted settlement, go back to list
      if (view === 'details' && selectedSettlement?.id === settlementToDelete.id) {
        setView('list');
        setSelectedSettlement(null);
        setSettlementDetails(null);
      }

      // Reload settlements
      await loadSettlements(filters);

    } catch (err) {
      console.error('Error deleting settlement:', err);
      setError(err.message || 'Failed to delete settlement');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteSettlement = (settlement) => {
    setSettlementToDelete(settlement);
    setShowDeleteConfirm(true);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const applyFilters = () => {
    loadSettlements(filters);
  };

  const clearFilters = () => {
    setFilters({ paid_by: '', paid_to: '' });
    loadSettlements({});
  };

  const handleSettlementClick = (settlement) => {
    setSelectedSettlement(settlement);
    loadSettlementDetails(settlement.id);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedSettlement(null);
    setSettlementDetails(null);
  };

  const handleClose = () => {
    setView('list');
    setSelectedSettlement(null);
    setSettlementDetails(null);
    setError(null);
    setShowDeleteConfirm(false);
    setSettlementToDelete(null);
    onClose();
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            {view === 'details' && (
              <button
                onClick={handleBackToList}
                className="mr-3 p-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center">
              <HandCoins className="w-6 h-6 text-orange-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">
                {view === 'list' ? 'All Settlements' : 'Settlement Details'}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex-shrink-0">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === 'list' ? (
            // Settlements List View
            <div className="p-6">
              {/* Filters Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
                <div className="flex items-center mb-3">
                  <Filter size={16} className="text-gray-600 mr-2" />
                  <span className="font-medium text-gray-700">Filter Settlements</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Paid By
                    </label>
                    <select
                      value={filters.paid_by}
                      onChange={(e) => handleFilterChange('paid_by', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">All Members</option>
                      {groupMembers.map((member) => (
                        <option key={member.id || member.user_id} value={member.id || member.user_id}>
                          {member.name || member.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Paid To
                    </label>
                    <select
                      value={filters.paid_to}
                      onChange={(e) => handleFilterChange('paid_to', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">All Members</option>
                      {groupMembers.map((member) => (
                        <option key={member.id || member.user_id} value={member.id || member.user_id}>
                          {member.name || member.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={applyFilters}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center"
                    >
                      <Filter size={16} className="mr-1" />
                      Apply
                    </button>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center"
                    >
                      <RefreshCw size={16} className="mr-1" />
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-2 text-gray-600">Loading settlements...</span>
                </div>
              ) : settlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <HandCoins size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No settlements found</p>
                  <p className="text-sm">No settlements have been created for this group yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => handleSettlementClick(settlement)}
                        >
                          <div className="flex items-center mb-2">
                            <span className="text-sm text-gray-600 mr-2">From:</span>
                            <span className="font-medium text-gray-800">
                              {getMemberName(settlement.paid_by)}
                            </span>
                            <span className="mx-2 text-gray-400">→</span>
                            <span className="text-sm text-gray-600 mr-2">To:</span>
                            <span className="font-medium text-gray-800">
                              {getMemberName(settlement.paid_to)}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(settlement.settled_at)}
                          </div>
                          {settlement.note && (
                            <div className="mt-2 text-sm text-gray-600">
                              <FileText size={14} className="inline mr-1" />
                              {settlement.note}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600 flex items-center">
                              <FaIndianRupeeSign className="w-4 h-4 mr-1" />
                              {settlement.amount.toFixed(2)}
                            </div>
                          </div>
                          {/* Delete Button - show only if can_delete is true */}
                          {settlement.can_delete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteSettlement(settlement);
                              }}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete settlement"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Settlement Details View
            <div className="p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-2 text-gray-600">Loading settlement details...</span>
                </div>
              ) : settlementDetails ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Settlement Header */}
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2 flex items-center justify-center">
                        <FaIndianRupeeSign className="w-8 h-8 mr-2" />
                        {formatCurrency(settlementDetails.amount)}
                      </div>
                      <p className="text-gray-600">Settlement Amount</p>
                    </div>
                  </div>

                  {/* Settlement Details */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <User size={20} className="mr-2" />
                      Settlement Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Paid By
                        </label>
                        <div className="text-gray-800 font-medium">
                          {getMemberName(settlementDetails.paid_by)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Paid To
                        </label>
                        <div className="text-gray-800 font-medium">
                          {getMemberName(settlementDetails.paid_to)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date and Note */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Calendar size={20} className="mr-2" />
                      Additional Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Settlement Date
                        </label>
                        <div className="text-gray-800">
                          {formatDate(settlementDetails.settled_date)}
                        </div>
                      </div>
                      {settlementDetails.note && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Note
                          </label>
                          <div className="text-gray-800 bg-gray-50 p-3 rounded border">
                            {settlementDetails.note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
                    {/* Delete Button - show only if can_delete is true */}
                    {settlementDetails.can_delete && (
                      <button
                        onClick={() => confirmDeleteSettlement(settlementDetails)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete Settlement
                      </button>
                    )}
                  </div>

                  {/* Edit Permission Info */}
                  {settlementDetails.can_edit && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-700 flex items-center">
                        <FileText size={16} className="mr-2" />
                        You can edit this settlement since you created it.
                      </p>
                    </div>
                  )}

                  {/* Extra content for testing scroll */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Settlement History</h3>
                    <p className="text-gray-600 mb-2">This settlement was created to resolve outstanding balances between group members.</p>
                    <p className="text-gray-600 mb-2">All related expenses have been taken into account for this settlement calculation.</p>
                    <p className="text-gray-600">Once this settlement is completed, the debt between these members will be cleared.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <p className="text-gray-500">No settlement details available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle size={24} className="text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-800">Delete Settlement</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this settlement? This action cannot be undone.
              </p>

              {settlementToDelete && (
                <div className="bg-gray-50 rounded-lg p-3 mb-6">
                  <div className="text-sm text-gray-600">
                    <strong>Amount:</strong> {formatCurrency(settlementToDelete.amount)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>From:</strong> {getMemberName(settlementToDelete.paid_by)} → {getMemberName(settlementToDelete.paid_to)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Date:</strong> {formatDate(settlementToDelete.settled_at)}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSettlementToDelete(null);
                  }}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSettlement}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementsListModal;