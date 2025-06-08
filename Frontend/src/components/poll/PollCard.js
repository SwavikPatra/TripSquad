import React, { useState } from 'react';
import { Clock, Users, CheckCircle, XCircle, MoreVertical, BarChart3, Trash2 } from 'lucide-react';
import { updatePollStatus, deletePoll } from '../../services/api/poll_api';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, pollQuestion }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Poll</h3>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete the poll "{pollQuestion}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const PollCard = ({ poll, onClick, onUpdate, groupId, isAdmin }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleStatusToggle = async (e) => {
    e.stopPropagation(); // Prevent card click
    
    try {
      setUpdating(true);
      await updatePollStatus(poll.id, !poll.is_active);
      onUpdate(); // Refresh polls list
    } catch (error) {
      console.error('Failed to update poll status:', error);
    } finally {
      setUpdating(false);
      setShowMenu(false);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteModal(true);
    setShowMenu(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      await deletePoll(poll.id);
      onUpdate(); // Refresh polls list
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete poll:', error);
      // You might want to show an error toast here
    } finally {
      setDeleting(false);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation(); // Prevent card click
    setShowMenu(!showMenu);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = () => {
    if (poll.is_active) {
      return 'text-green-600 bg-green-100';
    }
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = () => {
    if (poll.is_active) {
      return <CheckCircle className="w-3 h-3" />;
    }
    return <XCircle className="w-3 h-3" />;
  };

  // Calculate total votes
  const totalVotes = poll.options?.reduce((sum, option) => sum + (option.vote_count || 0), 0) || 0;

  return (
    <>
      <div
        onClick={onClick}
        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer relative"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-gray-800 line-clamp-2">{poll.question}</h4>
            {poll.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{poll.description}</p>
            )}
          </div>
          
          {/* Status and Menu */}
          <div className="flex items-center space-x-2 ml-3">
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-1">{poll.is_active ? 'Active' : 'Inactive'}</span>
            </span>
            
            {/* Admin Menu - Show if user is admin OR can delete */}
            {(isAdmin || poll.can_delete) && (
              <div className="relative">
                <button
                  onClick={handleMenuClick}
                  disabled={updating || deleting}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {/* Status Toggle - Only for admins */}
                      {isAdmin && (
                        <button
                          onClick={handleStatusToggle}
                          disabled={updating || deleting}
                          className="w-full flex items-center px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {poll.is_active ? (
                            <>
                              <XCircle className="w-4 h-4 mr-2 text-red-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                              Activate
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Delete Button - Show if user can delete */}
                      {poll.can_delete && (
                        <>
                          {isAdmin && <div className="border-t border-gray-100 my-1"></div>}
                          <button
                            onClick={handleDeleteClick}
                            disabled={updating || deleting}
                            className="w-full flex items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Poll Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-1" />
              <span>{poll.options?.length || 0} options</span>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{totalVotes} votes</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>Created {formatDate(poll.created_at)}</span>
          </div>
        </div>

        {/* Quick Preview of Top Option (if votes exist) */}
        {totalVotes > 0 && poll.options && poll.options.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {(() => {
              const topOption = poll.options.reduce((prev, current) => 
                (current.vote_count || 0) > (prev.vote_count || 0) ? current : prev
              );
              const percentage = totalVotes > 0 ? Math.round((topOption.vote_count / totalVotes) * 100) : 0;
              
              return (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Leading:</span> {topOption.option_text} ({percentage}%)
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        pollQuestion={poll.question}
      />
    </>
  );
};

export default PollCard;