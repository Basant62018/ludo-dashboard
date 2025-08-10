import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, Calendar } from 'lucide-react';
import Card from '../components/UI/Card';
import StatCard from '../components/UI/StatCard';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorModal from '../components/UI/ErrorModal';
import { adminApi } from '../utils/api';

interface RevenueData {
  date: string;
  totalGames: number;
  gameCount: number;
  platformRevenue: number;
}

interface RevenueStats {
  period: string;
  startDate: string;
  endDate: string;
  revenueData: RevenueData[];
}

const Analytics: React.FC = () => {
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [error, setError] = useState('');

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  useEffect(() => {
    fetchRevenueStats();
  }, [selectedPeriod]);

  const fetchRevenueStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await adminApi.getRevenueStats(selectedPeriod);
      
      if (response.success) {
        setRevenueStats(response.data);
      } else {
        setErrorModal({
          isOpen: true,
          message: response.message || 'Failed to load analytics'
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || 'Failed to load analytics'
      });
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

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!revenueStats) return null;

  // Calculate totals from revenue data
  const totalPlatformRevenue = revenueStats.revenueData.reduce((sum, item) => sum + item.platformRevenue, 0);
  const totalGames = revenueStats.revenueData.reduce((sum, item) => sum + item.gameCount, 0);
  const totalGameAmount = revenueStats.revenueData.reduce((sum, item) => sum + item.totalGames, 0);
  const averageRevenuePerGame = totalGames > 0 ? totalPlatformRevenue / totalGames : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="mt-2 text-gray-600">
            Analyze platform performance and revenue trends
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(totalPlatformRevenue)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Games"
          value={totalGames.toLocaleString()}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Total Game Amount"
          value={formatCurrency(totalGameAmount)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Avg Revenue/Game"
          value={formatCurrency(averageRevenuePerGame)}
          icon={Calendar}
          color="yellow"
        />
      </div>

      {/* Revenue Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Summary */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Summary</h3>
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-700">Total Platform Revenue</span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(totalPlatformRevenue)}
                </span>
              </div>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-700">Total Games Played</span>
                <span className="text-lg font-semibold text-blue-600">
                  {totalGames.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-700">Total Game Amount</span>
                <span className="text-lg font-semibold text-purple-600">
                  {formatCurrency(totalGameAmount)}
                </span>
              </div>
            </div>
            
            <div className="py-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Average Revenue per Game</span>
                <span className="text-lg font-semibold text-yellow-600">
                  {formatCurrency(averageRevenuePerGame)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Period Information */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Analysis Period</p>
              <p className="text-lg font-semibold text-gray-900">{getPeriodLabel(selectedPeriod)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Start Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(revenueStats.startDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">End Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(revenueStats.endDate).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Daily Revenue Trends */}
      {revenueStats.revenueData.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trends</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {revenueStats.revenueData.slice(-7).map((day, index) => (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">
                  {new Date(day.date).toLocaleDateString('en-IN', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-sm font-medium text-green-600 mb-1">
                  {formatCurrency(day.platformRevenue)}
                </div>
                <div className="text-xs text-gray-500">
                  {day.gameCount} games
                </div>
                <div className="text-xs text-blue-600">
                  {formatCurrency(day.totalGames)} total
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />
    </div>
  );
};

export default Analytics;