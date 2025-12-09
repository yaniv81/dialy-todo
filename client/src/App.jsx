import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // login, signup, dashboard

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setView('dashboard');
      } else {
        setUser(null);
        setView('login');
      }
    } catch (err) {
      console.error('Session check failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setView('login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        view === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} />
        ) : (
          <Signup onLogin={handleLogin} onSwitchToLogin={() => setView('login')} />
        )
      )}
    </div>
  );
}

export default App;
