import React, { useState, useEffect } from 'react';
import { getGroupById, createItineraryEntry, getGroupItineraryEntries, getGroupMembers } from '../services/api/group_api';
import { updateItineraryEntry } from '../services/api/itinerary_api';
import { createExpense } from '../services/api/expense_api';
import { createUserSettlement } from '../services/api/expense_api';
import GroupInfo from '../components/group/GroupInfo';
import GroupInfoModal from '../components/group/GroupInfoModal'; // New import
import ItinerarySection from '../components/group/ItinerarySection';
import PollSection from '../components/poll/PollSection';
import AddItineraryModal from '../components/group/AddItineraryModal';
import ItineraryDetailModal from '../components/group/ItineraryDetailModal';
import EditItineraryModal from '../components/group/EditItineraryModal';
import CreateExpenseModal from '../components/expense/CreateExpenseModal';
import ExpensesListModal from '../components/expense/ExpensesListModal';
import CreateSettlementModal from '../components/expense/CreateSettlementModal';
import SettlementsListModal from '../components/expense/SettlementsListModal';
import UserBalanceModal from '../components/expense/UserBalanceModal';

import { ArrowLeft, Eye, HandCoins, Wallet, Info } from 'lucide-react';
import { FaIndianRupeeSign } from "react-icons/fa6";

const RupeeIcon = () => <FaIndianRupeeSign />;

const GroupDetailsPage = () => {
  // Mock useParams - replace with your actual router implementation
  const group_id = window.location.pathname.split('/').pop();
  const navigate = (path) => {
    window.location.href = path;
  };
  
  // State management
  const [group, setGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [itineraryEntries, setItineraryEntries] = useState([]);
  const [loading, setLoading] = useState({
    group: true,
    itinerary: true,
    members: true
  });
  const [error, setError] = useState(null);
  const [itineraryError, setItineraryError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Expense modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [showExpensesListModal, setShowExpensesListModal] = useState(false);

  // Settlement modal states
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [creatingSettlement, setCreatingSettlement] = useState(false);
  const [showSettlementsListModal, setShowSettlementsListModal] = useState(false);

  // Balance modal state
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  // New state for group info modal
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  // Mock current user ID - replace with your actual auth implementation
  const currentUserId = 'current-user-id';

  // Load group data
  useEffect(() => {
    const loadGroupData = async () => {
      if (!group_id) return;
      
      try {
        setError(null);
        
        // Load group details and members in parallel
        const [groupData, membersData] = await Promise.all([
          getGroupById(group_id),
          getGroupMembers(group_id)
        ]);
        
        setGroup(groupData);
        setGroupMembers(Array.isArray(membersData) ? membersData : membersData?.data || []);
        
      } catch (err) {
        console.error('Failed to load group data:', err);
        setError(err.message);
      } finally {
        setLoading(prev => ({ ...prev, group: false, members: false }));
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

  // Reload itinerary entries helper
  const reloadItineraryEntries = async () => {
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
  };

  // Handle adding new itinerary entry
  const handleAddItinerary = async (entryData) => {
    try {
      setCreating(true);
      setError(null);
      
      await createItineraryEntry(group_id, entryData);
      
      // Close modal
      setShowAddModal(false);
      
      // Reload itinerary entries
      await reloadItineraryEntries();
      
    } catch (err) {
      console.error('Failed to create itinerary entry:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Handle creating new expense
  const handleCreateExpense = async (expenseData) => {
    try {
      setCreatingExpense(true);
      setError(null);
      
      await createExpense(group_id, expenseData);
      
      // Close modal
      setShowExpenseModal(false);
      
      console.log('Expense created successfully');
      
    } catch (err) {
      console.error('Failed to create expense:', err);
      setError(err.message);
      throw err; // Re-throw to let the modal handle the error
    } finally {
      setCreatingExpense(false);
    }
  };

  // Handle creating new settlement
  const handleCreateSettlement = async (settlementData) => {
    try {
      setCreatingSettlement(true);
      setError(null);
      
      await createUserSettlement(group_id, settlementData);
      
      // Close modal
      setShowSettlementModal(false);
      
      console.log('Settlement created successfully');
      
    } catch (err) {
      console.error('Failed to create settlement:', err);
      setError(err.message);
      throw err; // Re-throw to let the modal handle the error
    } finally {
      setCreatingSettlement(false);
    }
  };

  // Handle itinerary entry click (show detail modal)
  const handleEntryClick = (entryId) => {
    setSelectedEntryId(entryId);
    setShowDetailModal(true);
  };

  // Handle edit button click
  const handleEditEntry = (entry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  // Handle update entry
  const handleUpdateEntry = async (entryId, updateData) => {
    try {
      setUpdating(true);
      setError(null);
      
      await updateItineraryEntry(entryId, updateData);
      
      // Close edit modal
      setShowEditModal(false);
      setSelectedEntry(null);
      
      // Reload itinerary entries
      await reloadItineraryEntries();
      
    } catch (err) {
      console.error('Failed to update itinerary entry:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Handle delete entry
  const handleDeleteEntry = async (entryId) => {
    try {
      // Close detail modal
      setShowDetailModal(false);
      setSelectedEntryId(null);
      
      // Reload itinerary entries
      await reloadItineraryEntries();
      
    } catch (err) {
      console.error('Failed to handle delete:', err);
      setError(err.message);
    }
  };

  // Loading state
  if (loading.group || loading.members) {
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
            {/* Clickable group name that opens modal */}
            <button
              onClick={() => setShowGroupInfoModal(true)}
              className="text-3xl font-bold text-gray-800 hover:text-blue-600 transition-colors flex items-center"
            >
              {group?.name || 'Group Details'}
              <Info className="w-6 h-6 ml-2 text-gray-500" />
            </button>
          </div>
          {/* Action Buttons - Only show if group exists */}
          {group && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowBalanceModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Your Balance
              </button>
              <button
                onClick={() => setShowExpensesListModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                See All Expenses
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <FaIndianRupeeSign className="w-4 h-4 mr-2" />
                Add Expense
              </button>
              <button
                onClick={() => setShowSettlementModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center"
              >
                <HandCoins className="w-4 h-4 mr-2" />
                Create Settlement
              </button>
              <button
                onClick={() => setShowSettlementsListModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <HandCoins className="w-4 h-4 mr-2" />
                View Settlements
              </button>
            </div>
          )}
        </header>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded flex-shrink-0">
            {error}
          </div>
        )}

        {/* Group Info, Itinerary Section, and Poll Section */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: Group Information (now for images and documents) */}
          <div className="flex-1">
            <GroupInfo 
              group={group} 
              loading={loading.group}
            />
          </div>

          {/* Center: Itinerary Section */}
          <div className="flex-1">
            <ItinerarySection
              itineraryEntries={itineraryEntries}
              loading={loading.itinerary}
              error={itineraryError}
              onAddClick={() => setShowAddModal(true)}
              onEntryClick={handleEntryClick}
            />
          </div>

          {/* Right: Poll Section */}
          <div className="flex-1">
            <PollSection
              groupId={group_id}
              group={group}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section - 70% height (blank for now) */}
      <div className="h-7/10 mt-6 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <p className="text-gray-500">This space is reserved for future features</p>
      </div>

      {/* Group Info Modal */}
      <GroupInfoModal
        isOpen={showGroupInfoModal}
        onClose={() => setShowGroupInfoModal(false)}
        group={group}
        groupMembers={groupMembers}
      />

      {/* Add Itinerary Modal */}
      <AddItineraryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItinerary}
        loading={creating}
        error={error}
      />

      {/* Settlements List Modal */}
      <SettlementsListModal
        isOpen={showSettlementsListModal}
        onClose={() => setShowSettlementsListModal(false)}
        groupId={group_id}
        groupMembers={groupMembers}
      />

      {/* Itinerary Detail Modal */}
      <ItineraryDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEntryId(null);
        }}
        entryId={selectedEntryId}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />

      {/* Edit Itinerary Modal */}
      <EditItineraryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
        entry={selectedEntry}
        onUpdate={handleUpdateEntry}
        loading={updating}
        error={error}
      />

      {/* Create Expense Modal */}
      <CreateExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleCreateExpense}
        groupId={group_id}
        loading={creatingExpense}
        error={error}
      />

      {/* Expenses List Modal */}
      <ExpensesListModal
        isOpen={showExpensesListModal}
        onClose={() => setShowExpensesListModal(false)}
        groupId={group_id}
      />

      {/* Create Settlement Modal */}
      <CreateSettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        onSubmit={handleCreateSettlement}
        groupId={group_id}
        groupMembers={groupMembers}
        currentUserId={currentUserId}
        loading={creatingSettlement}
        error={error}
      />

      {/* User Balance Modal */}
      <UserBalanceModal
        isOpen={showBalanceModal}
        onClose={() => setShowBalanceModal(false)}
        groupId={group_id}
      />
    </div>
  );
};

export default GroupDetailsPage;