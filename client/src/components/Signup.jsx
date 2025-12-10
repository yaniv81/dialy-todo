import React, { useState } from 'react';
import api from '../lib/axios';

export default function Signup({ onLogin, onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await api.post('/api/auth/register', { email, password });

            // Auto login after signup
            try {
                const loginRes = await api.post('/api/auth/login', { email, password });
                onLogin(loginRes.data.user);
            } catch (loginErr) {
                onSwitchToLogin();
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Signup failed';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen px-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-center text-gray-800">Create Account</h1>
                <p className="text-center text-gray-500">Join Daily Flow to organize your life</p>

                {error && <div className="p-3 text-sm text-red-600 bg-red-100 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full px-4 py-2 font-bold text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition ${isLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <svg className="w-5 h-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        ) : 'Sign Up'}
                    </button>
                </form>

                <div className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="font-medium text-blue-600 hover:text-blue-500">
                        Log in
                    </button>
                </div>
            </div>
        </div>
    );
}
