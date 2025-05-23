import React, { useState, useEffect } from 'react';
import { getGroupById, createItineraryEntry, getGroupItineraryEntries } from '../services/api/group_api';
import GroupInfo from '../components/group/GroupInfo';
import ItinerarySection from '../components/group/ItinerarySection';
import AddItineraryModal from '../components/group/AddItineraryModal';
import { ArrowLeft } from 'lucide-react';

const GroupDetailsPage = () => {
  // Mock useParams - replace with your actual router implementation
  const group_id = window.location.pathname.split('/').pop();
  const navigate = (path) => {
    window.location.href = path;
  };
  
  // State management
  const [group, setGroup] = useState(null);
  const [itineraryEntries, setItineraryEntries] = useState([]);
  const [loading, setLoading] = useState({
    group: true,
    itinerary: true
  });
  const [error, setError] = useState(null);
  const [itineraryError, setItineraryError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load group data
  useEffect(() => {
    const loadGroupData = async () => {
      if (!group_id) return;
      
      try {
        setError(null);
        
        // Load group details
        const groupData = await getGroupById(group_id);
        setGroup(groupData);
        
      } catch (err) {
        console.error('Failed to load group:', err);
        setError(err.message);
      } finally {
        setLoading(prev => ({ ...prev, group: false }));
      }
    };

    loadGroupData();
  }, [group_id]);

  // Load itinerary entries
  useEffect(() => {
    const loadItineraryEntries = async () => {
      if (!group_id) return;
      
      try {
        setItineraryError(null);
        const entries = await getGroupItineraryEntries(group_id);
        
        // Ensure we have an array
        if (Array.isArray(entries)) {
          setItineraryEntries(entries);
        } else if (entries && typeof entries === 'object' && entries.data && Array.isArray(entries.data)) {
          // Handle case where API returns { data: [...] }
          setItineraryEntries(entries.data);
        } else {
          console.warn('API returned unexpected format:', entries);
          setItineraryEntries([]);
        }
        
      } catch (err) {
        console.error('Failed to load itinerary entries:', err);
        setItineraryError(err.message);
        setItineraryEntries([]);
      } finally {
        setLoading(prev => ({ ...prev, itinerary: false }));
      }
    };

    loadItineraryEntries();
  }, [group_id]);

  // Handle adding new itinerary entry
  const handleAddItinerary = async (entryData) => {
    try {
      setCreating(true);
      setError(null);
      
      await createItineraryEntry(group_id, entryData);
      
      // Close modal
      setShowAddModal(false);
      
      // Reload itinerary entries
      setLoading(prev => ({ ...prev, itinerary: true }));
      try {
        const entries = await getGroupItineraryEntries(group_id);
        
        if (Array.isArray(entries)) {
          setItineraryEntries(entries);
        } else if (entries && typeof entries === 'object' && entries.data && Array.isArray(entries.data)) {
          setItineraryEntries(entries.data);
        } else {
          setItineraryEntries([]);
        }
        
      } catch (reloadError) {
        console.error('Failed to reload itinerary entries:', reloadError);
        setItineraryError(reloadError.message);
      } finally {
        setLoading(prev => ({ ...prev, itinerary: false }));
      }
      
    } catch (err) {
      console.error('Failed to create itinerary entry:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Handle itinerary entry click
  const handleEntryClick = (entryId) => {
    navigate(`/itinerary/${entryId}`);
  };

  // Loading state
  if (loading.group) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading group details...</span>
      </div>
    );
  }

  // Error state
  if (error && !group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl h-screen flex flex-col">
      {/* Top Section - 30% height */}
      <div className="h-3/10 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              {group?.name || 'Group Details'}
            </h1>
          </div>
        </header>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded flex-shrink-0">
            {error}
          </div>
        )}

        {/* Group Info and Itinerary Section */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: Group Information */}
          <div className="flex-1">
            <GroupInfo 
              group={group} 
              loading={loading.group} 
            />
          </div>

          {/* Right: Itinerary Section */}
          <div className="flex-1">
            <ItinerarySection
              itineraryEntries={itineraryEntries}
              loading={loading.itinerary}
              error={itineraryError}
              onAddClick={() => setShowAddModal(true)}
              onEntryClick={handleEntryClick}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - 70% height (blank for now) */}
      <div className="h-7/10 mt-6 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <p className="text-gray-500">This space is reserved for future features</p>
      </div>

      {/* Add Itinerary Modal */}
      <AddItineraryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItinerary}
        loading={creating}
        error={error}
      />
    </div>
  );
};

export default GroupDetailsPage;