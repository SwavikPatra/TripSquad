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