import React, { useState, useEffect } from 'react';
import { Users, TowerControl as GameController2, TrendingUp, Clock, Award, DollarSign } from 'lucide-react';
import StatCard from '../components/UI/StatCard';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { adminApi } from '../utils/api';

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalRooms: number;
    activeRooms: number;
    pendingWithdrawals: number;
    pendingWinnerRequests: number;
  };
  monthlyStats: {
    deposits: number;
    withdrawals: number;
    gameRevenue: number;
    totalTransactions: number;
  };
  recentTransactions: Array<{
    _id: string;
    type: string;
    amount: number;
    user: {
      _id: string;
      name: string;
      phone: string;
    };
    createdAt: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDashboardStats();
      
      if (response.success) {
        setStats(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard statistics');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
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
      year: 'numeric'
    });
  };

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="success">Deposit</Badge>;
      case 'withdrawal':
        return <Badge variant="warning">Withdrawal</Badge>;
      case 'game_win':
        return <Badge variant="info">Game Win</Badge>;
      case 'game_loss': 
        return <Badge variant="error">Game Loss</Badge>;
      case 'refund':
        return <Badge variant="default">Refund</Badge>;
      case 'admin_credit':
        return <Badge variant="success">Admin Credit</Badge>;
      case 'admin_debit':
        return <Badge variant="error">Admin Debit</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-gray-600">
          Monitor your Ludo Looto platform's performance and key metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.overview.totalUsers.toLocaleString()}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Rooms"
          value={stats.overview.activeRooms}
          icon={GameController2}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyStats.gameRevenue)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Pending Requests"
          value={stats.overview.pendingWinnerRequests}
          icon={Award}
          color="red"
        />
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Deposits</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(stats.monthlyStats.deposits)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Withdrawals</span>
              <span className="text-sm font-medium text-red-600">
                {formatCurrency(stats.monthlyStats.withdrawals)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Game Revenue</span>
              <span className="text-sm font-medium text-blue-600">
                {formatCurrency(stats.monthlyStats.gameRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Transactions</span>
              <span className="text-sm font-medium text-purple-600">
                {stats.monthlyStats.totalTransactions.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Rooms</span>
              <span className="text-sm font-medium text-blue-600">
                {stats.overview.totalRooms.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pending Withdrawals</span>
              <span className="text-sm font-medium text-yellow-600">
                {stats.overview.pendingWithdrawals}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pending Winner Requests</span>
              <span className="text-sm font-medium text-red-600">
                {stats.overview.pendingWinnerRequests}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Recent Transactions
          </h3>
        <div className="space-y-3">
          {stats.recentTransactions.slice(0, 5).map((transaction) => (
            <div key={transaction._id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{transaction.user?.name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500">{transaction.user?.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  {getTransactionTypeBadge(transaction.type)}
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatDate(transaction.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {stats.recentTransactions.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent transactions</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;