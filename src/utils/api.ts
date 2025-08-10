import { apiEndpoints } from '../config/api';
import { getAuthToken, logout } from './auth';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiCall = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      logout();
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new ApiError(response.status, data.message || 'API call failed');
    }
    
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Network error occurred');
  }
};

export const adminApi = {
  // Authentication
  login: (credentials: { username: string; password: string }) =>
    apiCall(apiEndpoints.adminLogin, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  logout: () =>
    apiCall(apiEndpoints.adminLogout, { method: 'POST' }),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiCall(apiEndpoints.changePassword, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard & Analytics
  getDashboardStats: () => apiCall(apiEndpoints.dashboardStats),
  getSystemStats: () => apiCall(apiEndpoints.systemStats),
  getRevenueStats: (period: string = '30d') => 
    apiCall(`${apiEndpoints.revenueStats}?period=${period}`),

  // User Management
  getUsers: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`${apiEndpoints.users}?${queryString}`);
  },
  
  getUserDetails: (userId: string) => apiCall(apiEndpoints.userDetails(userId)),
  
  updateBalance: (userId: string, data: { amount: number; type: 'add' | 'deduct'; reason: string }) =>
    apiCall(apiEndpoints.updateBalance(userId), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Room Management
  getRooms: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`${apiEndpoints.rooms}?${queryString}`);
  },
  
  getRoomDetails: (roomId: string) => apiCall(apiEndpoints.roomDetails(roomId)),
  
  declareCorrectWinner: (roomId: string, data: { winnerId: string; reason: string }) =>
    apiCall(apiEndpoints.declareWinner(roomId), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  cancelRoom: (roomId: string, reason: string) =>
    apiCall(apiEndpoints.cancelRoom(roomId), {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

  // Data Export
  exportData: (type: string, params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`${apiEndpoints.exportData(type)}?${queryString}`);
  },

  // Winner Verification Management
  getWinnerRequests: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`${apiEndpoints.winnerRequests}?${queryString}`);
  },
  
  getWinnerRequestDetails: (requestId: string) => 
    apiCall(apiEndpoints.winnerRequestDetails(requestId)),
  
  approveWinnerRequest: (requestId: string, data: { notes?: string }) =>
    apiCall(apiEndpoints.approveWinnerRequest(requestId), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  rejectWinnerRequest: (requestId: string, data: { reason: string }) =>
    apiCall(apiEndpoints.rejectWinnerRequest(requestId), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Withdrawal Request Management
  getWithdrawalRequests: (params: any = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`${apiEndpoints.withdrawalRequests}?${queryString}`);
  },
  
  getWithdrawalRequestDetails: (requestId: string) => 
    apiCall(apiEndpoints.withdrawalRequestDetails(requestId)),
  
  approveWithdrawalRequest: (requestId: string, data: { notes?: string; paymentProof?: string }) =>
    apiCall(apiEndpoints.approveWithdrawalRequest(requestId), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  rejectWithdrawalRequest: (requestId: string, data: { reason: string }) =>
    apiCall(apiEndpoints.rejectWithdrawalRequest(requestId), {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export { ApiError };