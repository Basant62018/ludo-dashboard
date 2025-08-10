import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import GameRooms from './pages/GameRooms';
import Analytics from './pages/Analytics';
import WinnerVerification from './pages/WinnerVerification';
import Withdrawals from './pages/Withdrawals';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="rooms" element={<GameRooms />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="winner-verification" element={<WinnerVerification />} />
            <Route path="withdrawals" element={<Withdrawals />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;