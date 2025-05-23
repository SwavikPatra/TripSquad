// services/api/group_api.js
import api from './index.js';

const API_PREFIX = '/group'

// Existing functions
export const addMembers = async (groupId, members) => {
  return api.post(`/groups/${groupId}/members`, { members });
};

export const getMembers = async (groupId) => {
  return api.get(`/groups/${groupId}/members`);
};

export const removeMember = async (groupId, userId) => {
  return api.delete(`/groups/${groupId}/members/${userId}`);
};

export const getGroupItineraryEntries = async (groupId, skip = 0, limit = 100) => {
  return api.get(`${API_PREFIX}/${groupId}/itinerary-entries/?skip=${skip}&limit=${limit}`);
};

export const uploadAttachment = async (groupId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/groups/${groupId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const listAttachments = async (groupId) => {
  return api.get(`/groups/${groupId}/attachments`);
};

export const deleteGroup = async (groupId) => {
  return api.delete(`/groups/${groupId}`);
};

export const getAttachmentUrl = async (attachmentId) => {
  return api.get(`/attachments/${attachmentId}/url`);
};

export const getUserBalances = async () => {
  return api.get(`/user/balances`);
};

export const deleteAttachment = async (attachmentId) => {
  return api.delete(`/attachments/${attachmentId}`);
};

export const createGroup = async (groupData) => {
  return api.post(`${API_PREFIX}/`, {
    name: groupData.name,
    description: groupData.description
  });
};

export const joinGroup = async (joinCode) => {
  return api.post('/groups/join', { code: joinCode });
};

// New functions for GroupDetailsPage
export const getGroupById = async (groupId) => {
  const response = await api.get(`${API_PREFIX}/${groupId}`);
  return response.data;
};

export const createItineraryEntry = async (groupId, entryData) => {
  const response = await api.post(`/itineraries/groups/${groupId}/itinerary`, {
    title: entryData.title,
    description: entryData.description,
    day_number: entryData.day_number,
    google_maps_link: entryData.google_maps_link,
    group_id: groupId
  });
  return response.data;
};

export const getItineraryEntry = async (entryId) => {
  const response = await api.get(`/itinerary-entries/${entryId}`);
  return response.data;
};

// export const getGroupItineraryEntries = async (groupId) => {
//   const response = await api.get(`/itinerary-entries/?group_id=${groupId}`);
//   return response.data;
// };