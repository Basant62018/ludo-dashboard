import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Check, X, Clock, CreditCard, AlertCircle, DollarSign } from 'lucide-react';
import Card from '../components/UI/Card';
import Table from '../components/UI/Table';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorModal from '../components/UI/ErrorModal';
import SuccessModal from '../components/UI/SuccessModal';
import { adminApi } from '../utils/api';

interface WithdrawalRequest {
  _id: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
    balance: number;
  };
  transactionId: {
    _id: string;
    transactionId: string;
    amount: number;
  };
  amount: number;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  processedAt?: string;
  processedBy?: {
    username: string;
  };
  adminNotes?: string;
  rejectionReason?: string;
  paymentProof?: string;
  userInfo: {
    name: string;
    phone: string;
  };
}

const Withdrawals: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
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
    request: WithdrawalRequest | null;
  }>({
    isOpen: false,
    request: null
  });

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    request: WithdrawalRequest | null;
  }>({
    isOpen: false,
    request: null
  });

  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    request: WithdrawalRequest | null;
  }>({
    isOpen: false,
    request: null
  });

  const [approveForm, setApproveForm] = useState({
    notes: '',
    paymentProof: ''
  });

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
      const response = await adminApi.getWithdrawalRequests({
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
        message: error.message || 'Failed to fetch withdrawal requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request: WithdrawalRequest) => {
    try {
      setActionLoading(prev => ({ ...prev, details: true }));
      const response = await adminApi.getWithdrawalRequestDetails(request._id);
      
      if (response.success) {
        setDetailsModal({
          isOpen: true,
          request: response.data.withdrawalRequest
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
      await adminApi.approveWithdrawalRequest(approveModal.request._id, {
        notes: approveForm.notes,
        paymentProof: approveForm.paymentProof
      });

      setApproveModal({ isOpen: false, request: null });
      setApproveForm({ notes: '', paymentProof: '' });
      setSuccessModal({
        isOpen: true,
        message: 'Withdrawal request approved successfully!'
      });
      fetchRequests();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to approve withdrawal request'
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
      await adminApi.rejectWithdrawalRequest(rejectModal.request._id, {
        reason: rejectReason
      });

      setRejectModal({ isOpen: false, request: null });
      setRejectReason('');
      setSuccessModal({
        isOpen: true,
        message: 'Withdrawal request rejected and amount refunded to user!'
      });
      fetchRequests();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to reject withdrawal request'
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
      case 'cancelled':
        return <Badge variant="default">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns = [
    {
      key: 'userInfo',
      label: 'User',
      render: (value: any, row: WithdrawalRequest) => (
        <div>
          <div className="font-medium text-gray-900">{value.name}</div>
          <div className="text-sm text-gray-500">{value.phone}</div>
        </div>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-green-600">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'upiId',
      label: 'UPI ID',
      render: (value: string) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{value}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'requestedAt',
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
      key: 'processedAt',
      label: 'Processed',
      render: (value: string, row: WithdrawalRequest) => {
        if (value) {
          return (
            <div>
              <div className="text-sm">{formatDate(value)}</div>
              {row.processedBy && (
                <div className="text-xs text-gray-500">by {row.processedBy.username}</div>
              )}
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: WithdrawalRequest) => (
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
                  setApproveForm({ notes: '', paymentProof: '' });
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
  const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdrawal Management</h1>
          <p className="mt-2 text-gray-600">
            Review and process user withdrawal requests
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
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
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
                placeholder="Search by user name or phone..."
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
              <option value="cancelled">Cancelled</option>
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
              <option value="amount">Amount</option>
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
              Approve Withdrawal Request
            </h3>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>User:</strong> {approveModal.request.userInfo.name}<br />
                  <strong>Amount:</strong> {formatCurrency(approveModal.request.amount)}<br />
                  <strong>UPI ID:</strong> {approveModal.request.upiId}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  value={approveForm.notes}
                  onChange={(e) => setApproveForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Proof (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Payment reference or proof URL..."
                  value={approveForm.paymentProof}
                  onChange={(e) => setApproveForm(prev => ({ ...prev, paymentProof: e.target.value }))}
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
              Reject Withdrawal Request
            </h3>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>User:</strong> {rejectModal.request.userInfo.name}<br />
                  <strong>Amount:</strong> {formatCurrency(rejectModal.request.amount)}<br />
                  <strong>UPI ID:</strong> {rejectModal.request.upiId}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for rejecting this withdrawal request..."
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Rejecting this request will automatically refund the amount to the user's wallet.
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Withdrawal Request Details</h3>
              <button
                onClick={() => setDetailsModal({ isOpen: false, request: null })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Information */}
              <Card>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Request Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-green-600">{formatCurrency(detailsModal.request.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">UPI ID:</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{detailsModal.request.upiId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    {getStatusBadge(detailsModal.request.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Requested:</span>
                    <span className="font-medium">{formatDate(detailsModal.request.requestedAt)}</span>
                  </div>
                  {detailsModal.request.processedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed:</span>
                      <span className="font-medium">{formatDate(detailsModal.request.processedAt)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* User Information */}
              <Card>
                <h4 className="font-semibold text-gray-900 mb-4">User Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{detailsModal.request.userInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{detailsModal.request.userInfo.phone}</span>
                  </div>
                  {detailsModal.request.userId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Balance:</span>
                      <span className="font-medium text-green-600">{formatCurrency(detailsModal.request.userId.balance)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Admin Notes */}
              {(detailsModal.request.adminNotes || detailsModal.request.rejectionReason) && (
                <Card className="lg:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-4">Admin Notes</h4>
                  <p className="text-gray-700">
                    {detailsModal.request.adminNotes || detailsModal.request.rejectionReason}
                  </p>
                  {detailsModal.request.processedBy && (
                    <p className="text-sm text-gray-500 mt-2">
                      By: {detailsModal.request.processedBy.username}
                    </p>
                  )}
                </Card>
              )}

              {/* Payment Proof */}
              {detailsModal.request.paymentProof && (
                <Card className="lg:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-4">Payment Proof</h4>
                  <p className="text-gray-700 font-mono text-sm bg-gray-100 p-3 rounded">
                    {detailsModal.request.paymentProof}
                  </p>
                </Card>
              )}
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

export default Withdrawals;