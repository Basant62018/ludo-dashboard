import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Check, X, Clock, Trophy, AlertCircle, Users } from 'lucide-react';
import Card from '../components/UI/Card';
import Table from '../components/UI/Table';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorModal from '../components/UI/ErrorModal';
import SuccessModal from '../components/UI/SuccessModal';
import { adminApi } from '../utils/api';

interface WinnerRequest {
  _id: string;
  roomId: string;
  gameRoomId: {
    _id: string;
    roomId: string;
    gameType: string;
    amount: number;
    players: Array<{
      userId: {
        _id: string;
        name: string;
        phone: string;
      };
      joinedAt: string;
    }>;
    createdAt: string;
    startedAt?: string;
  };
  declaredBy: {
    _id: string;
    name: string;
    phone: string;
  };
  declaredWinner: {
    _id: string;
    name: string;
    phone: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  winnerAmount: number;
  totalPrizePool: number;
  platformFee: number;
  adminNotes?: string;
  processedBy?: {
    username: string;
  };
  processedAt?: string;
  createdAt: string;
  evidence?: {
    screenshots: string[];
    description: string;
  };
}

const WinnerVerification: React.FC = () => {
  const [requests, setRequests] = useState<WinnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  // Action modals
  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    request: WinnerRequest | null;
  }>({
    isOpen: false,
    request: null
  });

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    request: WinnerRequest | null;
  }>({
    isOpen: false,
    request: null
  });

  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    request: WinnerRequest | null;
    roomTransactions: any[];
  }>({
    isOpen: false,
    request: null,
    roomTransactions: []
  });

  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Loading states
  const [actionLoading, setActionLoading] = useState<{
    approve: boolean;
    reject: boolean;
    details: boolean;
  }>({
    approve: false,
    reject: false,
    details: false
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
    fetchRequests();
  }, [currentPage, filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getWinnerRequests({
        page: currentPage,
        limit: 20,
        ...filters
      });

      if (response.success) {
        setRequests(response.data.data);
        setTotalRequests(response.data.total);
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to fetch winner requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request: WinnerRequest) => {
    try {
      setActionLoading(prev => ({ ...prev, details: true }));
      const response = await adminApi.getWinnerRequestDetails(request._id);
      
      if (response.success) {
        setDetailsModal({
          isOpen: true,
          request: response.data.request,
          roomTransactions: response.data.roomTransactions
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to fetch request details'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, details: false }));
    }
  };

  const handleApproveRequest = async () => {
    if (!approveModal.request) return;

    try {
      setActionLoading(prev => ({ ...prev, approve: true }));
      await adminApi.approveWinnerRequest(approveModal.request._id, {
        notes: approveNotes
      });

      setApproveModal({ isOpen: false, request: null });
      setApproveNotes('');
      setSuccessModal({
        isOpen: true,
        message: 'Winner request approved successfully! Winner has been credited with the prize money.'
      });
      fetchRequests();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to approve winner request'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, approve: false }));
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectModal.request || !rejectReason) {
      setErrorModal({
        isOpen: true,
        message: 'Please provide a reason for rejection'
      });
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, reject: true }));
      await adminApi.rejectWinnerRequest(rejectModal.request._id, {
        reason: rejectReason
      });

      setRejectModal({ isOpen: false, request: null });
      setRejectReason('');
      setSuccessModal({
        isOpen: true,
        message: 'Winner request rejected successfully! Room status has been reset to playing.'
      });
      fetchRequests();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to reject winner request'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const handleSort = (key: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: key,
      sortOrder: prev.sortBy === key && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
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
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns = [
    {
      key: 'roomId',
      label: 'Room ID',
      sortable: true,
      render: (value: string, row: WinnerRequest) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.gameRoomId.gameType}</div>
        </div>
      )
    },
    {
      key: 'declaredWinner',
      label: 'Declared Winner',
      render: (value: any) => (
        <div>
          <div className="font-medium text-gray-900 flex items-center">
            <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
            {value.name}
          </div>
          <div className="text-sm text-gray-500">{value.phone}</div>
        </div>
      )
    },
    {
      key: 'declaredBy',
      label: 'Declared By',
      render: (value: any) => (
        <div>
          <div className="font-medium text-gray-900">{value.name}</div>
          <div className="text-sm text-gray-500">{value.phone}</div>
        </div>
      )
    },
    {
      key: 'winnerAmount',
      label: 'Prize Amount',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-green-600">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'createdAt',
      label: 'Requested',
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
      render: (_: any, row: WinnerRequest) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewDetails(row)}
            disabled={actionLoading.details}
            className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => {
                  setApproveModal({ isOpen: true, request: row });
                  setApproveNotes('');
                }}
                className="p-1 text-green-600 hover:text-green-800"
                title="Approve Request"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setRejectModal({ isOpen: true, request: row });
                  setRejectReason('');
                }}
                className="p-1 text-red-600 hover:text-red-800"
                title="Reject Request"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Winner Verification</h1>
          <p className="mt-2 text-gray-600">
            Review and verify winner declarations from game rooms
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{totalRequests}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <X className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="createdAt">Request Date</option>
              <option value="winnerAmount">Prize Amount</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchRequests}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Requests Table */}
      <Table
        columns={columns}
        data={requests}
        loading={loading}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalRequests > 20 && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalRequests)} of {totalRequests} requests
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
                disabled={currentPage * 20 >= totalRequests}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Approve Modal */}
      {approveModal.isOpen && approveModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Approve Winner Request
            </h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Room:</strong> {approveModal.request.roomId}<br />
                  <strong>Winner:</strong> {approveModal.request.declaredWinner.name}<br />
                  <strong>Prize Amount:</strong> {formatCurrency(approveModal.request.winnerAmount)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setApproveModal({ isOpen: false, request: null })}
                disabled={actionLoading.approve}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                disabled={actionLoading.approve}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {actionLoading.approve ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Approve Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && rejectModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Reject Winner Request
            </h3>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Room:</strong> {rejectModal.request.roomId}<br />
                  <strong>Declared Winner:</strong> {rejectModal.request.declaredWinner.name}<br />
                  <strong>Prize Amount:</strong> {formatCurrency(rejectModal.request.winnerAmount)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for rejecting this winner request..."
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Rejecting this request will reset the room status to "playing" and allow players to declare a different winner.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setRejectModal({ isOpen: false, request: null })}
                disabled={actionLoading.reject}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={actionLoading.reject}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {actionLoading.reject ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  'Reject Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.request && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Winner Request Details</h3>
              <button
                onClick={() => setDetailsModal({ isOpen: false, request: null, roomTransactions: [] })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Information */}
              <Card>
                <h4 className="font-semibold text-gray-900 mb-4">Request Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room ID:</span>
                    <span className="font-medium">{detailsModal.request.roomId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Game Type:</span>
                    <span className="font-medium">{detailsModal.request.gameRoomId.gameType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Fee:</span>
                    <span className="font-medium">{formatCurrency(detailsModal.request.gameRoomId.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prize Amount:</span>
                    <span className="font-medium text-green-600">{formatCurrency(detailsModal.request.winnerAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee:</span>
                    <span className="font-medium">{formatCurrency(detailsModal.request.platformFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(detailsModal.request.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested:</span>
                    <span className="font-medium">{formatDate(detailsModal.request.createdAt)}</span>
                  </div>
                  {detailsModal.request.processedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed:</span>
                      <span className="font-medium">{formatDate(detailsModal.request.processedAt)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Players Information */}
              <Card>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Players ({detailsModal.request.gameRoomId.players.length})
                </h4>
                <div className="space-y-3">
                  {detailsModal.request.gameRoomId.players.map((player, index) => (
                    <div key={player.userId._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center">
                          {player.userId._id === detailsModal.request.declaredWinner._id && (
                            <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                          )}
                          {player.userId.name}
                        </div>
                        <div className="text-sm text-gray-500">{player.userId.phone}</div>
                      </div>
                      {player.userId._id === detailsModal.request.declaredWinner._id && (
                        <Badge variant="success">Declared Winner</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Declared By */}
              <Card>
                <h4 className="font-semibold text-gray-900 mb-4">Declared By</h4>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{detailsModal.request.declaredBy.name}</div>
                    <div className="text-sm text-gray-500">{detailsModal.request.declaredBy.phone}</div>
                  </div>
                </div>
              </Card>

              {/* Admin Notes */}
              {detailsModal.request.adminNotes && (
                <Card>
                  <h4 className="font-semibold text-gray-900 mb-4">Admin Notes</h4>
                  <p className="text-gray-700">{detailsModal.request.adminNotes}</p>
                  {detailsModal.request.processedBy && (
                    <p className="text-sm text-gray-500 mt-2">
                      By: {detailsModal.request.processedBy.username}
                    </p>
                  )}
                </Card>
              )}
            </div>

            {/* Room Transactions */}
            {detailsModal.roomTransactions.length > 0 && (
              <Card className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Room Transactions</h4>
                <div className="space-y-2">
                  {detailsModal.roomTransactions.map((transaction) => (
                    <div key={transaction._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{transaction.user.name}</div>
                        <div className="text-sm text-gray-500">{transaction.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(transaction.amount)}</div>
                        <div className="text-sm text-gray-500">{transaction.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
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

export default WinnerVerification;