import React, { useEffect, useState } from 'react';
import axios from 'axios';

const JoinRequests = ({ groupId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJoinRequests = async () => {
    try {
      const res = await axios.get(`/api/groups/${groupId}/join-requests`);
      setRequests(res.data || []);
    } catch (err) {
      setError('Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoinRequests();
  }, [groupId]);

  const handleAction = async (userId, action) => {
    try {
      setActionLoading(true);
      await axios.post(`/api/groups/${groupId}/join-requests/${userId}`, { action });
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } catch (err) {
      alert('Failed to perform action.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-gray-600">Loading join requests...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (requests.length === 0) return <div className="text-gray-600">No pending join requests.</div>;

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div
          key={req.user_id}
          className="flex justify-between items-center border p-3 rounded-md shadow-sm"
        >
          <div>
            <p className="font-medium text-gray-800">{req.username}</p>
            <p className="text-sm text-gray-500">{req.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction(req.user_id, 'accept')}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={actionLoading}
            >
              Accept
            </button>
            <button
              onClick={() => handleAction(req.user_id, 'reject')}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              disabled={actionLoading}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JoinRequests;
