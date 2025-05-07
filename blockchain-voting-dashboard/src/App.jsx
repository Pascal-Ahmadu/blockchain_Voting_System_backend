import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import ConnectWallet from "./components/ConnectWallet";
import DashboardLayout from "./components/dashboard/dashboard";
import CastVote from "./components/dashboard/children/castVote";
import ViewResults from "./components/dashboard/children/ViewResult";
import AdminDashboard from "./components/dashboard/admin/AdminDashboard";
import { checkAuth } from "./utils/api";
import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await checkAuth();
        if (response.data.authenticated) {
          setWalletAddress(response.data.walletAddress);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.log("No active session found");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = (address) => {
    setWalletAddress(address);
    setIsAuthenticated(true);
    localStorage.setItem("walletAddress", address);
  };

  const handleLogout = () => {
    setWalletAddress(null);
    setIsAuthenticated(false);
    localStorage.removeItem("walletAddress");
  };

  if (isLoading) {
    return <div className="loading">Loading authentication status...</div>;
  }

  return (
    <Router>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={!isAuthenticated ? <ConnectWallet onLogin={handleLogin} /> : <Navigate to="/dashboard/vote" replace />} />

        {/* Dashboard Layout with Child Routes */}
        <Route path="/dashboard" element={isAuthenticated ? <DashboardLayout userAddress={walletAddress} /> : <Navigate to="/" replace />}>
          <Route index element={<Navigate to="vote" replace />} />
          <Route path="vote" element={<CastVote userAddress={walletAddress} />} />
          <Route path="results" element={<ViewResults />} />
          <Route path="admin" element={<AdminDashboard userAddress={walletAddress} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
