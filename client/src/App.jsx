import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import api from './lib/axios';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // login, signup, dashboard

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
        setView('dashboard');
      } else {
        setUser(null);
        setView('login');
      }
    } catch (err) {
      // 401 or interactions error
      setUser(null);
      setView('login');
      if (err.response && err.response.status !== 401) {
        console.error('Session check failed', err);
      }
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
      await api.post('/api/auth/logout');
      setUser(null);
      setView('login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200">
        {user ? (
          <Dashboard user={user} onLogout={handleLogout} refreshUser={checkSession} />
        ) : (
          view === 'login' ? (
            <Login onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} />
          ) : (
            <Signup onLogin={handleLogin} onSwitchToLogin={() => setView('login')} />
          )
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
