import React from 'react';
import { Plus, AlertCircle } from 'lucide-react';

const ItinerarySection = ({ 
  itineraryEntries, 
  loading, 
  error,
  onAddClick, 
  onEntryClick 
}) => {
  const handleEntryClick = (entryId) => {
    if (onEntryClick) {
      onEntryClick(entryId);
    } else {
      // Fallback navigation
      window.location.href = `/itinerary/${entryId}`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      {/* Add Itinerary Button */}
      <div className="mb-4">
        <button 
          onClick={onAddClick}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Add Itinerary
        </button>
      </div>

      {/* Itinerary Entries */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Itinerary Entries</h3>
        
        {/* Error State */}
        {error && (
          <div className="flex items-center p-3 text-red-700 bg-red-100 border border-red-400 rounded mb-4">
            <AlertCircle size={20} className="mr-2" />
            <span className="text-sm">Failed to load itinerary entries: {error}</span>
          </div>
        )}
        
        {/* Loading State */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          /* Content State */
          <>
            {Array.isArray(itineraryEntries) && itineraryEntries.length > 0 ? (
              <div className="space-y-2">
                {itineraryEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md hover:bg-gray-50 cursor-pointer transition-all"
                    onClick={() => handleEntryClick(entry.id)}
                  >
                    <h4 className="font-medium text-blue-600 hover:text-blue-800">
                      {entry.title}
                    </h4>
                    {entry.day_number && (
                      <p className="text-sm text-gray-500 mt-1">
                        Day {entry.day_number}
                        {entry.creator_name && ` • Created by ${entry.creator_name}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  {error ? 'Unable to load itinerary entries' : 'No itinerary entries yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "Add Itinerary" to create your first entry
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ItinerarySection;