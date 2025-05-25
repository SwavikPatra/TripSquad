import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, ExternalLink, Calendar, User } from 'lucide-react';

const ItineraryDetailModal = ({ 
  isOpen, 
  onClose, 
  entryId, 
  onEdit, 
  onDelete,
  onUpdate
}) => {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load entry details when modal opens
  useEffect(() => {
    if (isOpen && entryId) {
      loadEntryDetails();
    }
  }, [isOpen, entryId]);

  const loadEntryDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // You'll need to import this from your API service
      const { getItineraryEntryById } = await import('../../services/api/itinerary_api');
      const entryData = await getItineraryEntryById(entryId);
      setEntry(entryData);
    } catch (err) {
      console.error('Failed to load entry details:', err);
      setError(err.message || 'Failed to load entry details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this itinerary entry?')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      
      // You'll need to import this from your API service
      const { deleteItineraryEntry } = await import('../../services/api/itinerary_api');
      await deleteItineraryEntry(entryId);
      
      // Notify parent component
      if (onDelete) {
        onDelete(entryId);
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError(err.message || 'Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(entry);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Itinerary Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error State */}
          {error && (
            <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading details...</span>
            </div>
          ) : entry ? (
            /* Entry Details */
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {entry.title}
                </h3>
              </div>

              {/* Meta Information */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                {entry.day_number && (
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-1" />
                    <span>Day {entry.day_number}</span>
                  </div>
                )}
                {entry.creator_name && (
                  <div className="flex items-center">
                    <User size={16} className="mr-1" />
                    <span>Created by {entry.creator_name}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {entry.description && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
                  <div className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {entry.description}
                  </div>
                </div>
              )}

              {/* Google Maps Link */}
              {entry.google_maps_link && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Location</h4>
                  <a
                    href={entry.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Entry not found</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {entry && !loading && (
          <div className="flex justify-between p-6 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} className="mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} className="mr-2" />
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItineraryDetailModal;