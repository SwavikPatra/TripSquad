import api from './index.js';

const API_PREFIX = '/expenses'

export const createExpense = async (groupId, expenseData) => {
  try {
    const response = await api.post(`${API_PREFIX}/${groupId}/expenses`, {
      group_id: groupId,
      ...expenseData
    });
    return response.data;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

// Get all expenses for a group
export const getGroupExpenses = async (groupId, options = {}) => {
  try {
    const {
      skip = 0,
      limit = 100,
      created_by = null,
      min_amount = null,
      max_amount = null
    } = options;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    
    if (created_by) params.append('created_by', created_by);
    if (min_amount !== null) params.append('min_amount', min_amount.toString());
    if (max_amount !== null) params.append('max_amount', max_amount.toString());

    const response = await api.get(`${API_PREFIX}/group/${groupId}/expenses/?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group expenses:', error);
    throw error;
  }
};

export const createUserSettlement = async (groupId, settlementData) => {
  try {
    const response = await api.post(`${API_PREFIX}/group/user/settlement`, {
      group_id: groupId,
      paid_to: settlementData.paid_to,
      amount: settlementData.amount,
      note: settlementData.note
    });
    return response.data;
  } catch (error) {
    console.error('Error creating settlement:', error);
    throw error;
  }
};


export const getGroupSettlements = async (groupId, filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.paid_by) params.append('paid_by', filters.paid_by);
    if (filters.paid_to) params.append('paid_to', filters.paid_to);
    if (filters.skip) params.append('skip', filters.skip);
    if (filters.limit) params.append('limit', filters.limit);
    
    const queryString = params.toString();
    const url = `${API_PREFIX}/group/${groupId}/settlements${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching group settlements:', error);
    throw error;
  }
};

export const getSettlementById = async (groupId, settlementId) => {
  try {
    const response = await api.get(`${API_PREFIX}/group/${groupId}/settlement/${settlementId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching settlement details:', error);
    throw error;
  }
};

export const deleteUserSettlement = async (groupId, settlementId) => {
  try {
    const response = await api.delete(`${API_PREFIX}/group/user/settlement`, {
      params: {
        settlement_id: settlementId,
        group_id: groupId
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting settlement:', error);
    throw error;
  }
};

// New function to get single expense details
export const getExpenseById = async (expenseId) => {
  try {
    const response = await api.get(`${API_PREFIX}/${expenseId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching expense details:', error);
    throw error;
  }
};

// New function to update expense
export const updateExpense = async (expenseId, updateData) => {
  try {
    const response = await api.put(`${API_PREFIX}/${expenseId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

// New function to delete expense
export const deleteExpense = async (groupId, expenseId) => {
  try {
    const response = await api.delete(`${API_PREFIX}/group/${groupId}/expense/${expenseId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};


