import React, { useState, useEffect } from 'react';
import { X, BarChart3, Users, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { getPoll, votePoll, getPollVoters } from '../../services/api/poll_api';

const PollDetailModal = ({ isOpen, onClose, pollId, onUpdate, groupId, isAdmin }) => {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showVoters, setShowVoters] = useState(false);
  const [voters, setVoters] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);

  // Load poll data when modal opens
  useEffect(() => {
    if (isOpen && pollId) {
      loadPoll();
      setSelectedOption(null);
      setShowVoters(false);
    }
  }, [isOpen, pollId]);

  const loadPoll = async () => {
    try {
      setLoading(true);
      setError(null);
      const pollData = await getPoll(pollId);
      setPoll(pollData);
    } catch (err) {
      console.error('Failed to load poll:', err);
      setError(err.message || 'Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId) => {
    if (!poll?.is_active) {
      setError('This poll is not active');
      return;
    }

    try {
      setVoting(true);
      setError(null);
      
      await votePoll({
        poll_id: pollId,
        option_id: optionId
      });

      // Reload poll data to get updated vote counts
      await loadPoll();
      onUpdate();
      
    } catch (err) {
      console.error('Failed to vote:', err);
      setError(err.message || 'Failed to submit vote');
    } finally {
      setVoting(false);
    }
  };

  const loadVoters = async (optionId = null) => {
    try {
      setLoadingVoters(true);
      const votersData = await getPollVoters(pollId, optionId);
      setVoters(votersData);
      setShowVoters(true);
    } catch (err) {
      console.error('Failed to load voters:', err);
      setError(err.message || 'Failed to load voters');
    } finally {
      setLoadingVoters(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (poll?.is_active) {
      return 'text-green-600 bg-green-100';
    }
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = () => {
    if (poll?.is_active) {
      return <CheckCircle className="w-4 h-4" />;
    }
    return <XCircle className="w-4 h-4" />;
  };

  const totalVotes = poll?.options?.reduce((sum, option) => sum + (option.vote_count || 0), 0) || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Poll Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading poll...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          ) : poll ? (
            <div className="space-y-6">
              {/* Poll Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-800">{poll.question}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="ml-1">{poll.is_active ? 'Active' : 'Inactive'}</span>
                  </span>
                </div>
                {poll.description && (
                  <p className="text-gray-600">{poll.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{totalVotes} votes</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Created {poll.created_at ? formatDate(poll.created_at) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Poll Options */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Options:</h4>
                {poll.options?.map((option) => {
                  const percentage = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
                  const isSelected = selectedOption === option.id;
                  
                  return (
                    <div key={option.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-800">{option.text}</span>
                        <span className="text-sm text-gray-600">{percentage}% ({option.vote_count})</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedOption(option.id);
                            handleVote(option.id);
                          }}
                          disabled={voting || !poll.is_active}
                          className={`text-xs px-2 py-1 rounded ${
                            isSelected 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          } ${!poll.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isSelected ? 'Voted ✓' : 'Vote'}
                        </button>
                        <button
                          onClick={() => loadVoters(option.id)}
                          disabled={loadingVoters}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center"
                        >
                          <User className="w-3 h-3 mr-1" />
                          See voters
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Voters Modal */}
              {showVoters && (
                <div className="border border-gray-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Voters</h4>
                    <button
                      onClick={() => setShowVoters(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {loadingVoters ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  ) : voters.length > 0 ? (
                    <div className="space-y-2">
                      {voters.map((voter, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                            <User className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="text-sm text-gray-800">{voter.name || voter.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No voters found</p>
                  )}
                </div>
              )}

              {/* All Voters Button */}
              <button
                onClick={() => loadVoters()}
                disabled={loadingVoters}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                See all voters
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Poll data not available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PollDetailModal;