import React, { useState } from 'react';
import Modal from '../Modal';

const AddItineraryModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  loading = false, 
  error = null 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    day_number: '',
    google_maps_link: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      title: formData.title,
      description: formData.description || null,
      day_number: formData.day_number ? parseInt(formData.day_number) : null,
      google_maps_link: formData.google_maps_link || null
    };
    
    onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      day_number: '',
      google_maps_link: ''
    });
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Itinerary Entry"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-gray-700 font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 font-medium mb-2">Day Number</label>
          <input
            type="number"
            name="day_number"
            value={formData.day_number}
            onChange={handleChange}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-gray-700 font-medium mb-2">Google Maps Link</label>
          <input
            type="url"
            name="google_maps_link"
            value={formData.google_maps_link}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://maps.google.com/..."
          />
        </div>
        
        {error && (
          <div className="p-3 text-red-700 bg-red-100 border border-red-400 rounded">
            {error}
          </div>
        )}
        
        <div className="flex gap-3 pt-4">
          <button 
            type="button"
            onClick={handleClose}
            className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            disabled={loading || !formData.title.trim()}
          >
            {loading ? 'Creating...' : 'Add Entry'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddItineraryModal;