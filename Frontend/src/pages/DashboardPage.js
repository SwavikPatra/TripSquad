import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGroup, getUserBalances, joinGroup } from '../services/api/group_api';
import { getUserGroups } from '../services/api/user_api';
import CreateGroupForm from '../components/group/CreateGroupForm';
import JoinGroupForm from '../components/group/JoinGroupForm';
import GroupCard from '../components/GroupCard';
import BalanceCard from '../components/BalanceCard';
import Modal from '../components/Modal';

const DashboardPage = () => {
  const [groups, setGroups] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const userGroups = await getUserGroups();
        setGroups(userGroups);
        
        const userBalances = await getUserBalances();
        setBalances(userBalances);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleCreateGroupSuccess = async (newGroup) => {
    try {
      setCreatingGroup(true);
      // Close the modal first
      setShowCreateModal(false);
      // Clear any previous errors
      setError(null);
      
      // Refresh the groups list from server to ensure data consistency
      const updatedGroups = await getUserGroups();
      setGroups(updatedGroups);
    } catch (err) {
      // If refresh fails, still add the new group to avoid blank state
      setGroups([...groups, newGroup]);
      setError('Group created successfully, but failed to refresh list. Please refresh manually.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleCreateGroupError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleJoinGroupSuccess = async () => {
    try {
      // Close the modal
      setShowJoinModal(false);
      // Clear any previous errors
      setError(null);
      
      // Refresh groups after joining
      const updatedGroups = await getUserGroups();
      setGroups(updatedGroups);
      
      // Also refresh balances as they might have changed
      const updatedBalances = await getUserBalances();
      setBalances(updatedBalances);
    } catch (err) {
      setError('Group joined successfully, but failed to refresh data. Please refresh manually.');
    }
  };

  const handleJoinGroupError = (errorMessage) => {
    setError(errorMessage);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Your Groups</h1>
        <div className="flex gap-3">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            Create Group
          </button>
          <button 
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            onClick={() => setShowJoinModal(true)}
          >
            Join Group
          </button>
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            onClick={async () => {
              const updatedBalances = await getUserBalances();
              setBalances(updatedBalances);
            }}
          >
            Refresh Balances
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
          {error}
        </div>
      )}

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Your Balances</h2>
        {balances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {balances.map((balance, index) => (
              <BalanceCard key={index} balance={balance} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No balances to display</p>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">Your Groups</h2>
          {creatingGroup && (
            <div className="text-sm text-blue-600 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Refreshing groups...
            </div>
          )}
        </div>
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <GroupCard 
                key={group.id} 
                group={group} 
                onClick={() => navigate(`/groups/${group.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">You're not a member of any groups yet</p>
        )}
      </section>

      {/* Create Group Modal */}
      <Modal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Group"
      >
        <CreateGroupForm 
          onSuccess={handleCreateGroupSuccess}
          onError={handleCreateGroupError}
        />
      </Modal>

      {/* Join Group Modal */}
      <Modal 
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Join Existing Group"
      >
        <JoinGroupForm 
          onSuccess={handleJoinGroupSuccess}
          onError={handleJoinGroupError}
        />
      </Modal>
    </div>
  );
};

export default DashboardPage;