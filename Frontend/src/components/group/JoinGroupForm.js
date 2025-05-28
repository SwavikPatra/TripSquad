import React, { useState } from 'react';
import { joinGroup } from '../../services/api/group_api';

const JoinGroupForm = ({ onSuccess, onError }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      onError('Please enter a group invite code');
      return;
    }

    setLoading(true);
    try {
      // Call the join group API
      await joinGroup(joinCode.trim());
      
      // Clear the form
      setJoinCode('');
      
      // Notify parent of success
      onSuccess();
    } catch (err) {
      onError(err.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-2">
          Group Invite Code
        </label>
        <input
          id="joinCode"
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter the group invite code"
          required
          disabled={loading}
        />
      </div>
      
      <button 
        type="submit" 
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Joining...
          </>
        ) : (
          'Join Group'
        )}
      </button>
    </form>
  );
};

export default JoinGroupForm;