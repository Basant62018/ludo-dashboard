export interface Admin {
  _id: string;
  username: string;
  role: string;
  permissions: {
    users: { view: boolean; edit: boolean; block: boolean; delete: boolean };
    rooms: { view: boolean; edit: boolean; declare_winner: boolean; cancel: boolean };
    transactions: { view: boolean; edit: boolean; refund: boolean };
    dashboard: { view: boolean; analytics: boolean };
  };
  lastLogin: string;
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('adminToken');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('adminToken', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('adminToken');
};

export const getAdmin = (): Admin | null => {
  const adminData = localStorage.getItem('adminData');
  return adminData ? JSON.parse(adminData) : null;
};

export const setAdmin = (admin: Admin): void => {
  localStorage.setItem('adminData', JSON.stringify(admin));
};

export const removeAdmin = (): void => {
  localStorage.removeItem('adminData');
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const logout = (): void => {
  removeAuthToken();
  removeAdmin();
};