import React, { useState, useEffect } from 'react';
import { Plus, BarChart3, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getGroupPolls } from '../../services/api/poll_api';
import CreatePollModal from './CreatePollModal';
import PollDetailModal from './PollDetailModal';
import PollCard from './PollCard';

const PollSection = ({ groupId, group }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [creating, setCreating] = useState(false);

  // Load polls on component mount
  useEffect(() => {
    if (groupId) {
      loadPolls();
    }
  }, [groupId]);

  const loadPolls = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getGroupPolls(groupId);
      
      // Handle direct array response
      if (Array.isArray(response)) {
        setPolls(response);
      } 
      // Or handle if it's wrapped in a data property
      else if (response.data && Array.isArray(response.data)) {
        setPolls(response.data);
      }
      // Handle error cases
      else {
        setError(response.message || 'Failed to load polls');
        setPolls([]);
      }
    } catch (err) {
      console.error('Failed to load polls:', err);
      setError(err.message || 'Failed to load polls');
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async (pollData) => {
    try {
      setCreating(true);
      setError(null);
      
      // The create poll API call will be handled in the modal
      // After successful creation, reload polls
      await loadPolls();
      setShowCreateModal(false);
      
    } catch (err) {
      console.error('Failed to create poll:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handlePollClick = (pollId) => {
    setSelectedPollId(pollId);
    setShowDetailModal(true);
  };

  const handlePollUpdate = async () => {
    // Reload polls when a poll is updated (voted, status changed, etc.)
    await loadPolls();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading polls...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center">
          <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Polls</h3>
          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {polls.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Poll
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Polls list */}
      <div className="flex-1 overflow-y-auto">
        {polls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No polls found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first poll to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onClick={() => handlePollClick(poll.id)}
                onUpdate={handlePollUpdate}
                groupId={groupId}
                isAdmin={group?.is_current_user_admin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePoll}
        groupId={groupId}
        loading={creating}
        error={error}
      />

      {/* Poll Detail Modal */}
      <PollDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPollId(null);
        }}
        pollId={selectedPollId}
        onUpdate={handlePollUpdate}
        groupId={groupId}
        isAdmin={group?.is_current_user_admin}
      />
    </div>
  );
};

export default PollSection;