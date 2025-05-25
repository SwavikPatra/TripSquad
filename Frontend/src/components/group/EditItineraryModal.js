import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const EditItineraryModal = ({ 
  isOpen, 
  onClose, 
  entry, 
  onUpdate,
  loading = false,
  error = null
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    day_number: '',
    google_maps_link: ''
  });

  // Initialize form data when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        description: entry.description || '',
        day_number: entry.day_number || '',
        google_maps_link: entry.google_maps_link || ''
      });
    }
  }, [entry]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    // Prepare update data (only include changed fields)
    const updateData = {};
    
    if (formData.title !== entry.title) {
      updateData.title = formData.title.trim();
    }
    if (formData.description !== (entry.description || '')) {
      updateData.description = formData.description.trim();
    }
    if (formData.day_number !== (entry.day_number || '')) {
      updateData.day_number = formData.day_number ? parseInt(formData.day_number) : null;
    }
    if (formData.google_maps_link !== (entry.google_maps_link || '')) {
      updateData.google_maps_link = formData.google_maps_link.trim() || null;
    }

    // Only proceed if there are changes
    if (Object.keys(updateData).length > 0) {
      await onUpdate(entry.id, updateData);
    } else {
      onClose();
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Edit Itinerary Entry</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                required
                placeholder="Enter itinerary title"
              />
            </div>

            {/* Day Number */}
            <div>
              <label htmlFor="day_number" className="block text-sm font-medium text-gray-700 mb-1">
                Day Number
              </label>
              <input
                type="number"
                id="day_number"
                name="day_number"
                value={formData.day_number}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="e.g., 1, 2, 3..."
                min="1"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Describe your itinerary entry..."
              />
            </div>

            {/* Google Maps Link */}
            <div>
              <label htmlFor="google_maps_link" className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps Link
              </label>
              <input
                type="url"
                id="google_maps_link"
                name="google_maps_link"
                value={formData.google_maps_link}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItineraryModal;