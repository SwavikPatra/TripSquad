import React, { useState, useEffect } from 'react';
import { X, DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { FaIndianRupeeSign } from "react-icons/fa6";
import { getUserNetBalancesInGroup } from '../../services/api/user_api';

const UserBalanceModal = ({ isOpen, onClose, groupId }) => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load balances when modal opens
  useEffect(() => {
    if (isOpen && groupId) {
      loadBalances();
    }
  }, [isOpen, groupId]);

  const loadBalances = async () => {
    try {
      setLoading(true);
      setError(null);
      const balanceData = await getUserNetBalancesInGroup(groupId);
      setBalances(Array.isArray(balanceData) ? balanceData : []);
    } catch (err) {
      console.error('Failed to load balances:', err);
      setError(err.message || 'Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return Math.abs(amount).toFixed(2);
  };

  const getBalanceColor = (direction) => {
    return direction === 'owes_you' ? 'text-green-600' : 'text-red-600';
  };

  const getBalanceIcon = (direction) => {
    return direction === 'owes_you' ? (
      <ArrowUp className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-600" />
    );
  };

  const getTotalBalance = () => {
    return balances.reduce((total, balance) => {
      return total + (balance.direction === 'owes_you' ? balance.net_amount : -balance.net_amount);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Your Balance
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading balances...</span>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="text-red-600 text-center mb-4">
                Error: {error}
              </div>
              <button
                onClick={loadBalances}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="p-6">
              {/* Total Balance Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="text-sm text-gray-600 mb-1">Net Balance</div>
                <div className={`text-2xl font-bold flex items-center ${
                  getTotalBalance() >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <FaIndianRupeeSign className="w-5 h-5 mr-1" />
                  {formatAmount(getTotalBalance())}
                  {getTotalBalance() >= 0 ? (
                    <ArrowUp className="w-5 h-5 ml-2 text-green-600" />
                  ) : (
                    <ArrowDown className="w-5 h-5 ml-2 text-red-600" />
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {getTotalBalance() >= 0 ? 'You are owed overall' : 'You owe overall'}
                </div>
              </div>

              {/* Individual Balances */}
              {balances.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No balances found</p>
                  <p className="text-sm">All settled up! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Individual Balances</h3>
                  {balances.map((balance, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-gray-600 font-medium">
                            {balance.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {balance.other_user_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {balance.direction === 'owes_you' ? 'Owes you' : 'You owe'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {getBalanceIcon(balance.direction)}
                        <span className={`ml-2 font-bold flex items-center ${getBalanceColor(balance.direction)}`}>
                          <FaIndianRupeeSign className="w-4 h-4 mr-1" />
                          {formatAmount(balance.net_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserBalanceModal;