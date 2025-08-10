import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Plus, Minus } from 'lucide-react';
import Card from '../components/UI/Card';
import Table from '../components/UI/Table';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorModal from '../components/UI/ErrorModal';
import SuccessModal from '../components/UI/SuccessModal';
import { adminApi } from '../utils/api';

interface User {
  _id: string;
  name: string;
  phone: string;
  balance: number;
  totalGames: number;
  totalWins: number;
  totalWinnings: number;
  isActive: boolean;
  createdAt: string;
  winRate: number;
  recentTransactions: number;
  activeRooms: number;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  // Balance update modal state
  const [balanceModal, setBalanceModal] = useState<{
    isOpen: boolean;
    user: User | null;
    type: 'add' | 'deduct';
  }>({
    isOpen: false,
    user: null,
    type: 'add'
  });

  const [balanceForm, setBalanceForm] = useState({
    amount: '',
    reason: ''
  });

  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers({
        page: currentPage,
        limit: 20,
        ...filters
      });

      if (response.success) {
        setUsers(response.data.data);
        setTotalUsers(response.data.total);
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to fetch users'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setFilterLoading(true);
      await fetchUsers();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to apply filters'
      });
    } finally {
      setFilterLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: key,
      sortOrder: prev.sortBy === key && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleUpdateBalance = async () => {
    if (!balanceModal.user || !balanceForm.amount || !balanceForm.reason) {
      setErrorModal({
        isOpen: true,
        message: 'Please fill in all required fields'
      });
      return;
    }

    const amount = parseFloat(balanceForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setErrorModal({
        isOpen: true,
        message: 'Please enter a valid amount'
      });
      return;
    }

    try {
      setBalanceLoading(true);
      await adminApi.updateBalance(balanceModal.user._id, {
        amount: amount,
        type: balanceModal.type,
        reason: balanceForm.reason
      });

      setBalanceModal({ isOpen: false, user: null, type: 'add' });
      setBalanceForm({ amount: '', reason: '' });
      setSuccessModal({
        isOpen: true,
        message: `Balance ${balanceModal.type === 'add' ? 'added' : 'deducted'} successfully!`
      });
      fetchUsers();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to update balance'
      });
    } finally {
      setBalanceLoading(false);
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
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (value: string, row: User) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-green-600">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'totalGames',
      label: 'Games',
      sortable: true,
      render: (value: number, row: User) => (
        <div>
          <div className="text-sm font-medium">{value} played</div>
          <div className="text-xs text-gray-500">{row.totalWins} won ({row.winRate}%)</div>
        </div>
      )
    },
    {
      key: 'totalWinnings',
      label: 'Total Winnings',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: User) => (
        <div className="flex space-x-2">
          <button
            className="p-1 text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setBalanceModal({ isOpen: true, user: row, type: 'add' });
              setBalanceForm({ amount: '', reason: '' });
            }}
            className="p-1 text-green-600 hover:text-green-800"
            title="Add Balance"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setBalanceModal({ isOpen: true, user: row, type: 'deduct' });
              setBalanceForm({ amount: '', reason: '' });
            }}
            className="p-1 text-red-600 hover:text-red-800"
            title="Deduct Balance"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">
            View and monitor user activity and statistics
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by name or phone..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="createdAt">Join Date</option>
              <option value="balance">Balance</option>
              <option value="totalGames">Total Games</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleApplyFilters}
              disabled={filterLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {filterLoading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filters
                </>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Table
        columns={columns}
        data={users}
        loading={loading}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalUsers > 20 && (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalUsers)} of {totalUsers} users
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
                disabled={currentPage * 20 >= totalUsers}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Balance Update Modal */}
      {balanceModal.isOpen && balanceModal.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {balanceModal.type === 'add' ? 'Add Balance' : 'Deduct Balance'} - {balanceModal.user.name}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-800">
                  <strong>Current Balance:</strong> {formatCurrency(balanceModal.user.balance)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount"
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for balance update"
                  rows={3}
                  value={balanceForm.reason}
                  onChange={(e) => setBalanceForm(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              
              {balanceModal.type === 'deduct' && balanceForm.amount && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This will deduct {formatCurrency(parseFloat(balanceForm.amount) || 0)} from the user's balance.
                    {parseFloat(balanceForm.amount) > balanceModal.user.balance && (
                      <span className="text-red-600 block mt-1">
                        Insufficient balance! User only has {formatCurrency(balanceModal.user.balance)}.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setBalanceModal({ isOpen: false, user: null, type: 'add' });
                  setBalanceForm({ amount: '', reason: '' });
                }}
                disabled={balanceLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBalance}
                disabled={balanceLoading || (balanceModal.type === 'deduct' && parseFloat(balanceForm.amount) > balanceModal.user.balance)}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                  balanceModal.type === 'add' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {balanceLoading ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  `${balanceModal.type === 'add' ? 'Add' : 'Deduct'} Balance`
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

export default Users;