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
  const response = await api.get(`/user/balances`);
  return response.data;
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

// may not need this safe to delete
// export const joinGroup = async (joinCode) => {
//   return api.post('/groups/join', { code: joinCode });
// };

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

// Get group members
export const getGroupMembers = async (groupId) => {
  try {
    const response = await api.get(`${API_PREFIX}/${groupId}/members`);
    return response.data;
  } catch (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }
};

// Add members to group
export const addGroupMembers = async (groupId, memberData) => {
  try {
    const response = await api.post(`${API_PREFIX}/${groupId}/members`, memberData);
    return response.data;
  } catch (error) {
    console.error('Error adding group members:', error);
    throw error;
  }
};

// Remove member from group
export const removeGroupMember = async (groupId, userId) => {
  try {
    const response = await api.delete(`${API_PREFIX}/${groupId}/members/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing group member:', error);
    throw error;
  }
};

// Update member role (make admin)
export const updateMemberRole = async (groupId, userId, role) => {
  try {
    const response = await api.patch(`${API_PREFIX}/${groupId}/admins/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
};

// Join group using secret code
export const joinGroup = async (secretCode) => {
  try {
    const response = await api.post(`${API_PREFIX}/join`, {
      secret_code: secretCode
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to join group');
  }
};

// Get join requests for a group (admin only)
export const getJoinRequests = async (groupId) => {
  try {
    const response = await api.get(`${API_PREFIX}/${groupId}/join-requests`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Approve a join request (admin only)
export const approveJoinRequest = async (groupId, userId) => {
  try {
    const response = await api.post(`${API_PREFIX}/approve-join-requests`, {
      group_id: groupId,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Reject a join request (admin only)
export const rejectJoinRequest = async (groupId, userId) => {
  try {
    const response = await api.put(`${API_PREFIX}/reject-join-requests`, {
      group_id: groupId,
      user_id: userId
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// export const getGroupItineraryEntries = async (groupId) => {
//   const response = await api.get(`/itinerary-entries/?group_id=${groupId}`);
//   return response.data;
// };

// Upload attachment to a group
export const uploadGroupAttachment = async (groupId, file, attachmentType = 'media') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('attachment_type', attachmentType);
  
  return api.post(`${API_PREFIX}/attachments?group_id=${groupId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Get list of attachments for a group
export const getGroupAttachments = async (groupId, attachmentType = null) => {
  let url = `${API_PREFIX}/${groupId}/attachments`;
  if (attachmentType) {
    url += `?attachment_type=${attachmentType}`;
  }
  return api.get(url);
};

// Get presigned URL for attachment download
export const getAttachmentPresignedUrl = async (attachmentId) => {
  return api.get(`${API_PREFIX}/attachments/${attachmentId}`);
};

// Delete attachment
export const deleteGroupAttachment = async (attachmentId) => {
  return api.delete(`${API_PREFIX}/attachments/${attachmentId}`);
};