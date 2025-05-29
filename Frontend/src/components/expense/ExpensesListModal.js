import React, { useState, useEffect } from 'react';
import { getGroupExpenses } from '../../services/api/expense_api';
import { X, Calendar, User, Paperclip, Search, Filter } from 'lucide-react';
import { FaIndianRupeeSign } from "react-icons/fa6";

const ExpensesListModal = ({ isOpen, onClose, groupId }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    minAmount: '',
    maxAmount: '',
    createdBy: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load expenses when modal opens
  useEffect(() => {
    if (isOpen && groupId) {
      loadExpenses();
    }
  }, [isOpen, groupId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {};
      if (filterOptions.minAmount) filters.min_amount = parseFloat(filterOptions.minAmount);
      if (filterOptions.maxAmount) filters.max_amount = parseFloat(filterOptions.maxAmount);
      if (filterOptions.createdBy) filters.created_by = filterOptions.createdBy;
      
      const expensesData = await getGroupExpenses(groupId, filters);
      setExpenses(expensesData);
      
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setError(err.message);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses by search term
  const filteredExpenses = expenses.filter(expense =>
    expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

//   // Format currency helper
//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD'
//     }).format(amount);
//   };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,  // Ensures .00 for whole numbers
        maximumFractionDigits: 2,   // Limits to 2 decimal places
        }).format(amount);
    };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle filter apply
  const handleApplyFilters = () => {
    loadExpenses();
    setShowFilters(false);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilterOptions({
      minAmount: '',
      maxAmount: '',
      createdBy: ''
    });
    setSearchTerm('');
    loadExpenses();
  };

  // Calculate total amount
  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <FaIndianRupeeSign className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-800">Group Expenses</h2>
            {!loading && (
              <span className="ml-3 text-sm text-gray-500">
                ({filteredExpenses.length} expenses • Total: {formatCurrency(totalAmount)})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filterOptions.minAmount}
                    onChange={(e) => setFilterOptions(prev => ({ ...prev, minAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filterOptions.maxAmount}
                    onChange={(e) => setFilterOptions(prev => ({ ...prev, maxAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By (User ID)</label>
                  <input
                    type="text"
                    placeholder="User ID"
                    value={filterOptions.createdBy}
                    onChange={(e) => setFilterOptions(prev => ({ ...prev, createdBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content - This is the scrollable area */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading expenses...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-600 mb-4">Error: {error}</div>
                <button
                  onClick={loadExpenses}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FaIndianRupeeSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {expenses.length === 0 ? 'No expenses found for this group' : 'No expenses match your search criteria'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {expense.title}
                        </h3>
                        {expense.description && (
                          <p className="text-gray-600 mb-3 text-sm">
                            {expense.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(expense.created_at)}
                          </div>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            Split: {expense.split_type}
                          </div>
                          {expense.has_attachments && (
                            <div className="flex items-center text-blue-600">
                              <Paperclip className="w-4 h-4 mr-1" />
                              Attachments
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(expense.total_amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {expense.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {!loading && filteredExpenses.length > 0 && (
                <span>
                  Showing {filteredExpenses.length} of {expenses.length} expenses
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesListModal;