import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Ban, Trophy, Users, Clock, DollarSign } from 'lucide-react';
import Card from '../components/UI/Card';
import Table from '../components/UI/Table';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorModal from '../components/UI/ErrorModal';
import SuccessModal from '../components/UI/SuccessModal';
import { adminApi } from '../utils/api';

interface GameRoom {
  _id: string;
  roomId: string;
  gameType: string;
  amount: number;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'playing' | 'completed' | 'cancelled';
  players: Array<{
    userId: {
      _id: string;
      name: string;
      phone: string;
    };
    joinedAt: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    phone: string;
  };
  winner?: {
    _id: string;
    name: string;
    phone: string;
  };
  winnerAmount?: number;
  createdAt: string;
  completedAt?: string;
}

const GameRooms: React.FC = () => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRooms, setTotalRooms] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    gameType: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  // Winner declaration modal state
  const [winnerModal, setWinnerModal] = useState<{
    isOpen: boolean;
    room: GameRoom | null;
  }>({
    isOpen: false,
    room: null
  });

  const [winnerForm, setWinnerForm] = useState({
    winnerId: '',
    reason: ''
  });

  // Cancel room modal state
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    room: GameRoom | null;
  }>({
    isOpen: false,
    room: null
  });

  const [cancelReason, setCancelReason] = useState('');

  // Loading states
  const [actionLoading, setActionLoading] = useState<{
    declareWinner: boolean;
    cancelRoom: boolean;
  }>({
    declareWinner: false,
    cancelRoom: false
  });

  // Modal states
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  useEffect(() => {
    fetchRooms();
  }, [currentPage, filters]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getRooms({
        page: currentPage,
        limit: 20,
        ...filters
      });

      if (response.success) {
        setRooms(response.data.data);
        setTotalRooms(response.data.total);
      }
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: key,
      sortOrder: prev.sortBy === key && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDeclareWinner = async () => {
    if (!winnerModal.room || !winnerForm.winnerId || !winnerForm.reason) {
      setErrorModal({
        isOpen: true,
        message: 'Please select a winner and provide a reason'
      });
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, declareWinner: true }));
      await adminApi.declareCorrectWinner(winnerModal.room.roomId, {
        winnerId: winnerForm.winnerId,
        reason: winnerForm.reason
      });

      setWinnerModal({ isOpen: false, room: null });
      setWinnerForm({ winnerId: '', reason: '' });
      setSuccessModal({
        isOpen: true,
        message: 'Winner declared successfully!'
      });
      fetchRooms();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to declare winner'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, declareWinner: false }));
    }
  };

  const handleCancelRoom = async () => {
    if (!cancelModal.room || !cancelReason) {
      setErrorModal({
        isOpen: true,
        message: 'Please provide a reason for cancellation'
      });
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, cancelRoom: true }));
      await adminApi.cancelRoom(cancelModal.room.roomId, cancelReason);

      setCancelModal({ isOpen: false, room: null });
      setCancelReason('');
      setSuccessModal({
        isOpen: true,
        message: 'Room cancelled successfully and players have been refunded!'
      });
      fetchRooms();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to cancel room'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, cancelRoom: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="warning">Waiting</Badge>;
      case 'playing':
        return <Badge variant="info">Playing</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns = [
    {
      key: 'roomId',
      label: 'Room ID',
      sortable: true,
      render: (value: string, row: GameRoom) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.gameType}</div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Entry Fee',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-green-600">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'currentPlayers',
      label: 'Players',
      sortable: true,
      render: (value: number, row: GameRoom) => (
        <div className="flex items-center space-x-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{value}/{row.maxPlayers}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (value: any) => (
        <div>
          <div className="font-medium text-gray-900">{value.name}</div>
          <div className="text-sm text-gray-500">{value.phone}</div>
        </div>
      )
    },
    {
      key: 'winner',
      label: 'Winner',
      render: (value: any, row: GameRoom) => {
        if (row.status === 'completed' && value) {
          return (
            <div>
              <div className="font-medium text-gray-900 flex items-center">
                <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                {value.name}
              </div>
              <div className="text-sm text-green-600">{formatCurrency(row.winnerAmount || 0)}</div>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      }
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm">{formatDate(value)}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: GameRoom) => (
        <div className="flex space-x-2">
          <button
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {row.status === 'completed' && (
            <button
              onClick={() => {
                setWinnerModal({ isOpen: true, room: row });
                setWinnerForm({ winnerId: '', reason: '' });
              }}
              className="p-1 text-green-600 hover:text-green-800"
              title="Declare Winner"
            >
              <Trophy className="h-4 w-4" />
            </button>
          )}
          {['waiting', 'playing'].includes(row.status) && (
            <button
              onClick={() => {
                setCancelModal({ isOpen: true, room: row });
                setCancelReason('');
              }}
              className="p-1 text-red-600 hover:text-red-800"
              title="Cancel Room"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Game Rooms</h1>
          <p className="mt-2 text-gray-600">
            Monitor game rooms, manage winners, and handle room operations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rooms</p>
              <p className="text-2xl font-bold text-green-600">
                {rooms.filter(r => ['waiting', 'playing'].includes(r.status)).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-blue-600">
                {rooms.filter(r => r.status === 'completed').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Prize Pool</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(rooms.reduce((sum, room) => sum + (room.winnerAmount || 0), 0))}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by room ID..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              <option value="waiting">Waiting</option>
              <option value="playing">Playing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Game Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.gameType}
              onChange={(e) => setFilters(prev => ({ ...prev, gameType: e.target.value }))}
            >
              <option value="all">All Games</option>
              <option value="Ludo">Ludo</option>
              <option value="Snakes & Ladders">Snakes & Ladders</option>
              <option value="Carrom">Carrom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="createdAt">Created Date</option>
              <option value="amount">Entry Fee</option>
              <option value="currentPlayers">Players</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchRooms}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Rooms Table */}
      <Table
        columns={columns}
        data={rooms}
        loading={loading}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalRooms > 20 && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalRooms)} of {totalRooms} rooms
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage * 20 >= totalRooms}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Winner Declaration Modal */}
      {winnerModal.isOpen && winnerModal.room && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Declare Winner - Room {winnerModal.room.roomId}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Winner</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={winnerForm.winnerId}
                  onChange={(e) => setWinnerForm(prev => ({ ...prev, winnerId: e.target.value }))}
                >
                  <option value="">Select a player</option>
                  {winnerModal.room.players.map((player) => (
                    <option key={player.userId._id} value={player.userId._id}>
                      {player.userId.name} ({player.userId.phone})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for winner declaration"
                  rows={3}
                  value={winnerForm.reason}
                  onChange={(e) => setWinnerForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setWinnerModal({ isOpen: false, room: null })}
                disabled={actionLoading.declareWinner}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareWinner}
                disabled={actionLoading.declareWinner}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {actionLoading.declareWinner ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Declare Winner'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Room Modal */}
      {cancelModal.isOpen && cancelModal.room && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Cancel Room - {cancelModal.room.roomId}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for cancelling the room"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Cancelling this room will refund all players their entry fees.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setCancelModal({ isOpen: false, room: null })}
                disabled={actionLoading.cancelRoom}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelRoom}
                disabled={actionLoading.cancelRoom}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {actionLoading.cancelRoom ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Cancel Room'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </div>
  );
};

export default GameRooms;