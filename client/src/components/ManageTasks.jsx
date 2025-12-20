import React, { useState, useEffect } from 'react';
import api from '../lib/axios';


import TaskModal from './TaskModal';

export default function ManageTasks({ user, tasks, onClose, fetchTasks }) {
    // Local state for optimistic reordering?
    // We can just use props.tasks if we update parent or use local copy.
    const [localTasks, setLocalTasks] = useState([...tasks]);
    const [editingTask, setEditingTask] = useState(null);

    // Sync when props change
    useEffect(() => {
        setLocalTasks(tasks);
    }, [tasks]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/api/tasks/${id}`);
            const newTasks = localTasks.filter(t => t.id !== id);
            setLocalTasks(newTasks);
            fetchTasks();
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleUpdateTask = async (data) => {
        try {
            await api.patch(`/api/tasks/${editingTask.id}`, data);
            setEditingTask(null);
            fetchTasks(); // Helper to refresh parent (Dashboard)
            // Also update localTasks to reflect change immediately if we want smooth UX,
            // but fetchTasks will trigger prop update which syncs localTasks via useEffect.
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    const moveTask = async (index, direction) => {
        const newTasks = [...localTasks];
        if (direction === 'up' && index > 0) {
            [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
        } else if (direction === 'down' && index < newTasks.length - 1) {
            [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
        } else {
            return;
        }
        setLocalTasks(newTasks);

        // Send batch reorder to API
        try {
            await api.patch('/api/tasks/reorder/batch', { taskIds: newTasks.map(t => t.id) });
            fetchTasks();
        } catch (err) {
            console.error('Reorder failed', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-20 overflow-y-auto dark:bg-gray-900">
            <div className="max-w-3xl mx-auto p-6">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Tasks</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Done
                    </button>
                </div>

                <div className="space-y-2">
                    {localTasks.map((task, index) => (
                        <div key={task.id} className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex flex-col mr-4 gap-1">
                                <button
                                    onClick={() => moveTask(index, 'up')}
                                    disabled={index === 0}
                                    className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                    title="Move Up"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button
                                    onClick={() => moveTask(index, 'down')}
                                    disabled={index === localTasks.length - 1}
                                    className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                    title="Move Down"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            </div>

                            <div className="flex-1">
                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                    {task.text}
                                    {task.category && (
                                        <span
                                            style={{ backgroundColor: user?.categories?.find(c => c.name === task.category)?.color || '#3B82F6' }}
                                            className="ml-2 text-xs px-2 py-0.5 rounded text-white font-normal"
                                        >
                                            {task.category}
                                        </span>
                                    )}
                                </p>
                                <div className="flex gap-1 mt-1">
                                    {task.recurring === false ? (
                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                            One-off ({task.date})
                                        </span>
                                    ) : (
                                        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIndex) => (
                                            <span
                                                key={day}
                                                className={`text-[10px] px-1.5 py-0.5 rounded ${task.days.includes(dIndex) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-300'}`}
                                            >
                                                {day}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 items-center ml-4">
                                <button
                                    onClick={() => setEditingTask(task)}
                                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                    title="Edit Task"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                    title="Delete Task"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {localTasks.length === 0 && <p className="text-center text-gray-500 py-8">No tasks to manage.</p>}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => {
                            if (window.confirm('Reset App Data? This will clear all local cache and reload.')) {
                                if ('serviceWorker' in navigator) {
                                    navigator.serviceWorker.getRegistrations().then(registrations => {
                                        for (let registration of registrations) {
                                            registration.unregister();
                                        }
                                    });
                                }
                                caches.keys().then(names => {
                                    for (let name of names) {
                                        caches.delete(name);
                                    }
                                });
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.reload(true);
                            }
                        }}
                        className="w-full py-3 text-red-600 font-bold border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Force Reset App Data
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">
                        Use this if you see display issues or missing styles.
                    </p>
                </div>
            </div>
            {editingTask && (
                <TaskModal
                    user={user}
                    initialData={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={handleUpdateTask}
                />
            )}
        </div>
    );
}
