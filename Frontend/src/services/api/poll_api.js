// services/api/poll_api.js
import api from './index.js';

const API_PREFIX = '/polls';

// Create a new poll
export const createPoll = async (pollData) => {
  return api.post(`${API_PREFIX}/`, pollData);
};

// Get poll by ID with options and votes
export const getPoll = async (pollId) => {
  let response = api.get(`${API_PREFIX}/${pollId}`);
  return (await response).data;
};

// Get all polls for a group
export const getGroupPolls = async (groupId, skip = 0, limit = 100) => {
  return api.get(`${API_PREFIX}/${groupId}/polls`, {
    params: { skip, limit }
  });
};

// Vote on a poll
export const votePoll = async (voteData) => {
  return api.post(`${API_PREFIX}/vote`, voteData);
};

// Get poll results
export const getPollResults = async (pollId) => {
  return api.get(`${API_PREFIX}/${pollId}/results`);
};

// Get poll voters
export const getPollVoters = async (pollId, optionId = null) => {
  const params = optionId ? { option_id: optionId } : {};
  return api.get(`${API_PREFIX}/${pollId}/voters`, { params });
};

// Update poll status (activate/deactivate)
export const updatePollStatus = async (pollId, isActive) => {
  return api.patch(`${API_PREFIX}/${pollId}/status`, null, {
    params: { is_active: isActive }
  });
};