import api from './index.js';

const API_PREFIX = '/user'

export const getUserGroups = async () => {
  const response = await api.get(`${API_PREFIX}/groups`);
  return response.data; // Return just the data property from the response
};

export const getUserNetBalancesInGroup = async (groupId) => {
  try {
    const response = await api.get(`${API_PREFIX}/groups/${groupId}/balances`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user balances:', error);
    throw error;
  }
};