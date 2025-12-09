import React, { useState, useEffect } from 'react';
import ManageTasks from './ManageTasks';

export default function Dashboard({ user, onLogout }) {
    const [tasks, setTasks] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showManage, setShowManage] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Tasks
    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTaskComplete = async (task) => {
        const todayStr = new Date().toISOString().split('T')[0];
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
            await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: todayStr, completed: !isCompleted }),
            });
        } catch (err) {
            console.error('Update failed', err);
            fetchTasks(); // Revert on error
        }
    };

    const handleAddTask = async (text, days) => {
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, days }),
            });
            if (res.ok) {
                fetchTasks();
                setShowAddModal(false);
            }
        } catch (err) {
            console.error('Add failed', err);
        }
    };

    // Filter for today
    const todayIndex = new Date().getDay(); // 0-6 Sun-Sat
    const todayStr = new Date().toISOString().split('T')[0];

    const todaysTasks = tasks.filter(t => t.days.includes(todayIndex));

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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Daily Flow</h1>
                    <p className="text-gray-500 text-sm">
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        <span className="mx-2">•</span>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.email}</span>
                    <button onClick={onLogout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl w-full mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Today's Focus</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowManage(true)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                        >
                            Manage Tasks
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition shadow-sm"
                        >
                            + New Task
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {todaysTasks.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                            No tasks scheduled for today.
                            <br />
                            <button onClick={() => setShowAddModal(true)} className="text-blue-600 hover:underline mt-2">
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
                                    className={`flex items-center p-4 bg-white rounded-lg shadow-sm cursor-pointer transition transform hover:scale-[1.01] ${isCompleted ? 'opacity-50' : 'hover:shadow-md'}`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                                        {isCompleted && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={`text-lg font-medium flex-1 ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {task.text}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Add Task Modal */}
            {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} onAdd={handleAddTask} />}
        </div>
    );
}

function AddTaskModal({ onClose, onAdd }) {
    const [text, setText] = useState('');
    const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]); // Default Mon-Sun

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (index) => {
        if (days.includes(index)) {
            setDays(days.filter(d => d !== index));
        } else {
            setDays([...days, index]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text, days);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold mb-4">Add New Task</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                        placeholder="What needs to be done?"
                        value={text}
                        autoFocus
                        onChange={(e) => setText(e.target.value)}
                    />

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Repeat On</label>
                        <div className="flex justify-between">
                            {dayNames.map((name, index) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => toggleDay(index)}
                                    className={`w-10 h-10 rounded-full text-xs font-bold transition ${days.includes(index) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    {name.charAt(0)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" disabled={!text.trim()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Add Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
