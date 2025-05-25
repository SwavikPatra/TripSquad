import api from './index.js';

const API_PREFIX = '/itineraries'

// Get itinerary entry by ID
export const getItineraryEntryById = async (entryId) => {
  try {
    const response = await api.get(`${API_PREFIX}/itinerary-entries/${entryId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching itinerary entry:', error);
    throw error;
  }
};

// Update itinerary entry
export const updateItineraryEntry = async (entryId, updateData) => {
  try {
    const response = await api.patch(`${API_PREFIX}/itinerary-entries/${entryId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating itinerary entry:', error);
    throw error;
  }
};

// Delete itinerary entry
export const deleteItineraryEntry = async (entryId) => {
  try {
    const response = await api.delete(`${API_PREFIX}/itinerary-entries/${entryId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting itinerary entry:', error);
    throw error;
  }
};