import React, { useState, useEffect, useRef } from 'react';
import ManageTasks from './ManageTasks';
import TaskModal from './TaskModal';
import Notes from './Notes';
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

// ... (existing helper functions)

export default function Dashboard({ user, onLogout, refreshUser }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showManage, setShowManage] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
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

    // ... (existing subscriptions and clocks)

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

    const handleAddTask = async (text, days, recurring, frequency, startDate, alertEnabled, alertTime, alertMode, category, categoryColor) => {
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
                alertMode,
                category,
                categoryColor
            });
            fetchTasks();
            setShowAddModal(false);
            if (categoryColor) {
                refreshUser(); // Refresh user to get new categories
            }
        } catch (err) {
            console.error('Add failed', err);
        }
    };

    const [sortBy, setSortBy] = useState('priority');

    // Filter for today
    const todayIndex = new Date().getDay(); // 0-6 Sun-Sat
    const todayStr = getLocalDateStr();

    const todaysTasks = tasks.filter(t => {
        if (t.recurring) {
            if (t.frequency === 'everyOtherDay' && t.startDate) {
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

    // Sort logic
    todaysTasks.sort((a, b) => {
        if (sortBy === 'category') {
            const catA = a.category || '';
            const catB = b.category || '';
            if (catA !== catB) {
                if (!catA) return 1; // Put no-category at the end
                if (!catB) return -1;
                return catA.localeCompare(catB);
            }
        }
        return (a.priority || 0) - (b.priority || 0);
    });

    if (showManage) {
        return <ManageTasks
            user={user}
            tasks={tasks}
            onClose={() => { setShowManage(false); fetchTasks(); }}
            fetchTasks={fetchTasks}
            refreshUser={refreshUser}
        />;
    }

    if (showNotes) {
        return <Notes onClose={() => setShowNotes(false)} />;
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
            <main className="flex-1 max-w-3xl w-full mx-auto p-6 pb-28 dark:text-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Today's Focus</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-2 py-1 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        >
                            <option value="priority">Priority</option>
                            <option value="category">Category</option>
                        </select>
                    </div>
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
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-lg font-medium break-words flex-1 text-left ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                                {task.text}
                                            </span>
                                            {task.category && (
                                                <span
                                                    style={{ backgroundColor: user.categories?.find(c => c.name === task.category)?.color || '#3B82F6' }}
                                                    className="text-xs px-2 py-0.5 rounded text-white shrink-0"
                                                >
                                                    {task.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {task.recurring && (
                                                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIndex) => {
                                                    const isActive = task.days && task.days.includes(dIndex);
                                                    const isEveryOtherDay = task.frequency === 'everyOtherDay';
                                                    let colorClass = '';
                                                    if (isEveryOtherDay) {
                                                        colorClass = isActive ? 'bg-purple-600 text-white' : 'bg-orange-400 text-white opacity-80';
                                                    } else {
                                                        colorClass = isActive ? 'bg-green-500 text-white font-bold' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
                                                    }
                                                    return (
                                                        <span
                                                            key={day}
                                                            className={`text-[10px] w-8 py-0.5 rounded inline-flex justify-center ${colorClass}`}
                                                        >
                                                            {day}
                                                        </span>
                                                    );
                                                })
                                            )}
                                            {!task.recurring && (
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-400">One-off</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Add Task Modal */}
            {showAddModal && <TaskModal
                user={user}
                tasks={tasks}
                onClose={() => setShowAddModal(false)}
                refreshUser={refreshUser}
                fetchTasks={fetchTasks}
                onSave={(data) => handleAddTask(
                    data.text,
                    data.days,
                    data.recurring,
                    data.frequency,
                    data.startDate,
                    data.alertEnabled,
                    data.alertTime,
                    data.alertMode,
                    data.category,
                    data.categoryColor
                )}
            />}

            {/* Bottom Floating Bar */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-in-out z-20 flex justify-center gap-4 dark:bg-gray-800 dark:border-gray-700 ${showBottomBar ? 'translate-y-0' : 'translate-y-full'}`}>
                <button
                    onClick={() => setShowManage(true)}
                    className="flex-1 max-w-[140px] px-2 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                    Manage Tasks
                </button>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 max-w-[140px] px-2 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                    + New Task
                </button>
                <button
                    onClick={() => setShowNotes(true)}
                    className="flex-1 max-w-[140px] px-2 py-3 text-sm font-medium text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition dark:bg-gray-700 dark:text-yellow-200 dark:border-yellow-600 dark:hover:bg-gray-600"
                >
                    Notes
                </button>
            </div>
        </div>
    );
}
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

