// API Configuration
const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || 'https://luto.onrender.com/api';

export const apiEndpoints = {
  // Admin Authentication
  adminLogin: `${API_BASE_URL}/admin/login`,
  adminLogout: `${API_BASE_URL}/admin/logout`,
  changePassword: `${API_BASE_URL}/admin/change-password`,
  
  // Dashboard & Analytics
  dashboardStats: `${API_BASE_URL}/admin/dashboard/stats`,
  systemStats: `${API_BASE_URL}/admin/system/stats`,
  revenueStats: `${API_BASE_URL}/admin/revenue/stats`,
  
  // User Management
  users: `${API_BASE_URL}/admin/users`,
  userDetails: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
  blockUser: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/block`,
  unblockUser: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/unblock`,
  updateBalance: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/balance`,
  userActivity: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/activity`,
  
  // Room Management
  rooms: `${API_BASE_URL}/admin/rooms`,
  roomDetails: (roomId: string) => `${API_BASE_URL}/admin/rooms/${roomId}`,
  declareWinner: (roomId: string) => `${API_BASE_URL}/admin/rooms/${roomId}/declare-winner`,
  cancelRoom: (roomId: string) => `${API_BASE_URL}/admin/rooms/${roomId}/cancel`,
  
  // Transaction Management
  transactions: `${API_BASE_URL}/admin/transactions`,
  transactionDetails: (transactionId: string) => `${API_BASE_URL}/admin/transactions/${transactionId}`,
  processRefund: (transactionId: string) => `${API_BASE_URL}/admin/transactions/${transactionId}/refund`,
  
  // Data Export
  exportData: (type: string) => `${API_BASE_URL}/admin/export/${type}`,
  
  // Winner Verification Management
  winnerRequests: `${API_BASE_URL}/admin/winner-requests`,
  winnerRequestDetails: (requestId: string) => `${API_BASE_URL}/admin/winner-requests/${requestId}`,
  approveWinnerRequest: (requestId: string) => `${API_BASE_URL}/admin/winner-requests/${requestId}/approve`,
  rejectWinnerRequest: (requestId: string) => `${API_BASE_URL}/admin/winner-requests/${requestId}/reject`,
  
  // Withdrawal Request Management
  withdrawalRequests: `${API_BASE_URL}/admin/withdrawal-requests`,
  withdrawalRequestDetails: (requestId: string) => `${API_BASE_URL}/admin/withdrawal-requests/${requestId}`,
  approveWithdrawalRequest: (requestId: string) => `${API_BASE_URL}/admin/withdrawal-requests/${requestId}/approve`,
  rejectWithdrawalRequest: (requestId: string) => `${API_BASE_URL}/admin/withdrawal-requests/${requestId}/reject`,
};

export default API_BASE_URL;