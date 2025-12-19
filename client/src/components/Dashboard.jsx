import React, { useState, useEffect, useRef } from 'react';
import ManageTasks from './ManageTasks';
import api from '../lib/axios';
import ThemeToggle from './ThemeToggle';

// Helper to get local date string YYYY-MM-DD
const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper for VAPID
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function Dashboard({ user, onLogout }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showManage, setShowManage] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBottomBar, setShowBottomBar] = useState(true);

    // Scroll listener for bottom bar
    useEffect(() => {
        let lastScrollY = window.scrollY;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                setShowBottomBar(false);
            } else {
                setShowBottomBar(true);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Push Notifications
    const subscribeToPush = async () => {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.ready;

            // Get public key
            const res = await api.get('/api/config/vapid-public-key');
            const convertedVapidKey = urlBase64ToUint8Array(res.data.publicKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // Send to server
            await api.post('/api/notifications/subscribe', {
                subscription: subscription,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
            console.log('Subscribed to push');
        } catch (err) {
            console.error('Push subscription failed', err);
        }
    };

    useEffect(() => {
        if (Notification.permission === 'granted') {
            subscribeToPush();
        }
    }, []);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Tasks
    const fetchTasks = async () => {
        try {
            const res = await api.get('/api/tasks');
            setTasks(res.data);
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTaskComplete = async (task) => {
        const todayStr = getLocalDateStr();
        const isCompleted = task.completedDates.includes(todayStr);

        // Optimistic update
        const newTasks = tasks.map(t => {
            if (t.id === task.id) {
                if (isCompleted) {
                    return { ...t, completedDates: t.completedDates.filter(d => d !== todayStr) };
                } else {
                    return { ...t, completedDates: [...t.completedDates, todayStr] };
                }
            }
            return t;
        });
        setTasks(newTasks);

        try {
            await api.patch(`/api/tasks/${task.id}`, { date: todayStr, completed: !isCompleted });
        } catch (err) {
            console.error('Update failed', err);
            fetchTasks(); // Revert on error
        }
    };

    // ... imports and other code ...

    const handleAddTask = async (text, days, recurring, frequency, startDate, alertEnabled, alertTime, alertMode) => {
        try {
            await api.post('/api/tasks', {
                text,
                days,
                recurring,
                frequency, // 'daily', 'weekly', 'everyOtherDay'
                startDate,
                date: recurring ? undefined : getLocalDateStr(),
                alertEnabled,
                alertTime,
                alertMode
            });
            fetchTasks();
            setShowAddModal(false);
        } catch (err) {
            console.error('Add failed', err);
        }
    };

    // Filter for today
    const todayIndex = new Date().getDay(); // 0-6 Sun-Sat
    const todayStr = getLocalDateStr();

    // Helper to check if a date string matches today
    const isDateToday = (dateString, todayString) => {
        return dateString === todayString;
    };

    const todaysTasks = tasks.filter(t => {
        if (t.recurring) {
            if (t.frequency === 'everyOtherDay' && t.startDate) {
                // Calculate difference in days between start date and today
                const start = new Date(t.startDate);
                const today = new Date(todayStr);
                const diffTime = Math.abs(today - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // Using Math.ceil might be risky with timezones, let's allow small margin or normalize to noon
                // Better:
                const d1 = new Date(t.startDate); d1.setHours(0, 0, 0, 0);
                const d2 = new Date(todayStr); d2.setHours(0, 0, 0, 0);
                const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));

                return diff >= 0 && diff % 2 === 0;
            }
            return t.days.includes(todayIndex);
        } else {
            return t.date === todayStr;
        }
    });


    // Sort by priority (asc means 0 is top)
    todaysTasks.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    if (showManage) {
        return <ManageTasks
            tasks={tasks}
            onClose={() => { setShowManage(false); fetchTasks(); }}
            fetchTasks={fetchTasks}
        />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200">
            {/* Header */}
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-10 dark:bg-gray-800 dark:border-b dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Daily Flow</h1>
                    <p className="text-gray-500 text-sm dark:text-gray-400">
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        <span className="mx-2">•</span>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <span className="text-sm font-medium text-gray-700 hidden sm:block dark:text-gray-300">{user.email}</span>
                    <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Logout</button>
                </div>
            </header>


            {/* Main Content */}
            <main className="flex-1 max-w-3xl w-full mx-auto p-6 pb-24 dark:text-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Today's Focus</h2>

                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            Loading tasks...
                        </div>
                    ) : todaysTasks.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                            No tasks scheduled for today.
                            <br />
                            <button onClick={() => setShowAddModal(true)} className="text-blue-600 hover:underline mt-2 dark:text-blue-400">
                                Add a task
                            </button>
                        </div>
                    ) : (
                        todaysTasks.map(task => {
                            const isCompleted = task.completedDates.includes(todayStr);
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskComplete(task)}
                                    className={`flex items-center p-4 bg-white rounded-lg shadow-sm cursor-pointer transition transform hover:scale-[1.01] dark:bg-gray-800 dark:shadow-none dark:border dark:border-gray-700 ${isCompleted ? 'opacity-50' : 'hover:shadow-md'}`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                        {isCompleted && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={`text-lg font-medium flex-1 ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                        {task.text}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Add Task Modal */}
            {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} onAdd={handleAddTask} onSubscribe={subscribeToPush} />}

            {/* Bottom Floating Bar */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-in-out z-20 flex justify-center gap-4 dark:bg-gray-800 dark:border-gray-700 ${showBottomBar ? 'translate-y-0' : 'translate-y-full'}`}>
                <button
                    onClick={() => setShowManage(true)}
                    className="flex-1 max-w-xs px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                    Manage Tasks
                </button>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 max-w-xs px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    + New Task
                </button>
            </div>
        </div>
    );
}

function AddTaskModal({ onClose, onAdd, onSubscribe }) {
    const [text, setText] = useState('');
    const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]); // Default Mon-Sun
    const [doNotRepeat, setDoNotRepeat] = useState(false);
    const [repeatEveryOtherDay, setRepeatEveryOtherDay] = useState(false);

    // Alert State
    const [alertEnabled, setAlertEnabled] = useState(false);
    const [alertTime, setAlertTime] = useState('');
    const [alertMode, setAlertMode] = useState('both');
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (index) => {
        // Turning off special modes if user manually selects days
        if (doNotRepeat) setDoNotRepeat(false);
        if (repeatEveryOtherDay) setRepeatEveryOtherDay(false);

        if (days.includes(index)) {
            setDays(days.filter(d => d !== index));
        } else {
            setDays([...days, index]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        let frequency = 'weekly';
        let startDate = undefined;
        let isRecurring = !doNotRepeat;

        if (repeatEveryOtherDay) {
            frequency = 'everyOtherDay';
            startDate = getLocalDateStr();
        }

        onAdd(text, days, isRecurring, frequency, startDate, alertEnabled, alertTime, alertMode);
    };

    const handleEveryOtherDayToggle = () => {
        const newValue = !repeatEveryOtherDay;
        setRepeatEveryOtherDay(newValue);

        if (newValue) {
            setDoNotRepeat(false);
            // static visual pattern to indicate on/off logic: Sun, Tue, Thu, Sat
            setDays([0, 2, 4, 6]);
        } else {
            setDays([0, 1, 2, 3, 4, 5, 6]);
        }
    };

    const handleDoNotRepeatToggle = () => {
        const newValue = !doNotRepeat;
        setDoNotRepeat(newValue);

        if (newValue) {
            setRepeatEveryOtherDay(false);
            setDays([new Date().getDay()]);
        } else {
            setDays([0, 1, 2, 3, 4, 5, 6]);
        }
    };

    const handleAlertToggle = () => {
        if (!alertEnabled) {
            // User wants to enable
            if (!('Notification' in window)) {
                alert('This browser does not support desktop notifications');
                return;
            }

            if (Notification.permission === 'granted') {
                setAlertEnabled(true);
                if (onSubscribe) onSubscribe();
            } else if (Notification.permission === 'denied') {
                alert('Notifications are blocked. Please enable them in your browser settings.');
            } else {
                // Default - show contextual prompt
                setShowPermissionPrompt(true);
            }
        } else {
            // User wants to disable
            setAlertEnabled(false);
            setShowPermissionPrompt(false);
            setAlertTime('');
        }
    };

    const requestPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setShowPermissionPrompt(false);
            setAlertEnabled(true);
            if (onSubscribe) onSubscribe();
        } else {
            setShowPermissionPrompt(false);
            alert('Permission denied. Cannot set alerts.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 dark:bg-gray-800 dark:text-white">
                <h3 className="text-xl font-bold mb-4">Add New Task</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="What needs to be done?"
                        value={text}
                        autoFocus={typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches}
                        onChange={(e) => setText(e.target.value)}
                    />

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Repeat every other day</span>
                            <button
                                type="button"
                                onClick={handleEveryOtherDayToggle}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${repeatEveryOtherDay ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${repeatEveryOtherDay ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Do not repeat</span>
                            <button
                                type="button"
                                onClick={handleDoNotRepeatToggle}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${doNotRepeat ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${doNotRepeat ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        {/* Alert Toggle */}
                        <div className="flex flex-col bg-gray-50 p-3 rounded-lg border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Set Alert Time</span>
                                <button
                                    type="button"
                                    onClick={handleAlertToggle}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${alertEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${alertEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            {/* Contextual Permission Prompt */}
                            {showPermissionPrompt && (
                                <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-100">
                                    <p className="mb-2">To send you an alert at your chosen time, we need system permission.</p>
                                    <button
                                        type="button"
                                        onClick={requestPermission}
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-700"
                                    >
                                        Enable Notifications
                                    </button>
                                </div>
                            )}

                            {/* Alert Settings with Slide Down Animation */}
                            <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${alertEnabled ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className={`space-y-3 pl-1 border-gray-200 transition-all duration-300 ${alertEnabled ? 'pt-3 mt-3 border-t opacity-100' : 'pt-0 mt-0 border-none opacity-0'}`}>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 dark:text-gray-400">Time</label>
                                            <input
                                                type="time"
                                                value={alertTime}
                                                onChange={(e) => setAlertTime(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                required={alertEnabled}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">Mode</label>
                                            <div className="flex space-x-4">
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="alertMode"
                                                        value="vibration"
                                                        checked={alertMode === 'vibration'}
                                                        onChange={(e) => setAlertMode(e.target.value)}
                                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:bg-gray-600 dark:border-gray-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Vibrate</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="alertMode"
                                                        value="sound"
                                                        checked={alertMode === 'sound'}
                                                        onChange={(e) => setAlertMode(e.target.value)}
                                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:bg-gray-600 dark:border-gray-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Sound</span>
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="alertMode"
                                                        value="both"
                                                        checked={alertMode === 'both'}
                                                        onChange={(e) => setAlertMode(e.target.value)}
                                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 dark:bg-gray-600 dark:border-gray-500"
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Both</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200`}>Repeat On</label>
                        <div className="flex justify-between">
                            {dayNames.map((name, index) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => toggleDay(index)}
                                    className={`w-10 h-10 rounded-full text-xs font-bold transition ${repeatEveryOtherDay ? 'opacity-55' : ''} 
                                        ${days.includes(index)
                                            ? (repeatEveryOtherDay ? 'bg-blue-500 text-white' : 'bg-green-500 text-white')
                                            : (repeatEveryOtherDay ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                                    `}
                                >
                                    {name.charAt(0)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={!text.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md cursor-pointer dark:bg-blue-500 dark:hover:bg-blue-600">Add Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
