import React, { useState } from 'react';

export default function Signup({ onLogin, onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                // Auto login after signup
                const loginRes = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const loginData = await loginRes.json();
                if (loginRes.ok) {
                    onLogin(loginData.user);
                } else {
                    onSwitchToLogin();
                }
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (err) {
            setError('Network error');
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
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition"
                    >
                        Sign Up
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
