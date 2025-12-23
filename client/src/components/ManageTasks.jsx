import React, { useState, useEffect } from 'react';
import api from '../lib/axios';


import TaskModal from './TaskModal';
import ManageCategoriesModal from './ManageCategoriesModal';

export default function ManageTasks({ user, tasks, onClose, fetchTasks, refreshUser }) {
    // Local state for optimistic reordering?
    // We can just use props.tasks if we update parent or use local copy.
    const [localTasks, setLocalTasks] = useState([...tasks]);
    const [editingTask, setEditingTask] = useState(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

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
            <div className="max-w-3xl mx-auto p-4 md:p-6">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Tasks</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Done
                    </button>
                </div>

                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded font-medium dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    >
                        Edit Categories
                    </button>
                </div>

                <div className="space-y-2">
                    {localTasks.map((task, index) => (
                        <div key={task.id} className="relative flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex flex-col mr-2 md:mr-4 gap-4">
                                <button
                                    onClick={() => moveTask(index, 'up')}
                                    disabled={index === 0}
                                    className="p-3 text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg disabled:opacity-30 disabled:hover:bg-gray-50 disabled:hover:text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-blue-400 transition-colors"
                                    title="Move Up"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button
                                    onClick={() => moveTask(index, 'down')}
                                    disabled={index === localTasks.length - 1}
                                    className="p-3 text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg disabled:opacity-30 disabled:hover:bg-gray-50 disabled:hover:text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-blue-400 transition-colors"
                                    title="Move Down"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 pl-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="font-medium text-gray-800 dark:text-gray-100 break-words text-left pb-2">
                                        {task.text}
                                    </span>
                                    {task.category && (
                                        <span
                                            style={{ backgroundColor: user?.categories?.find(c => c.name === task.category)?.color || '#3B82F6' }}
                                            className="text-xs px-2 py-0.5 rounded text-white shrink-0 self-start mt-1"
                                        >
                                            {task.category}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {task.recurring === false ? (
                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                            One-off ({task.date})
                                        </span>
                                    ) : (
                                        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIndex) => {
                                            const isActive = task.days.includes(dIndex);
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
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                <button
                                    onClick={() => setEditingTask(task)}
                                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                    title="Edit Task"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
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
                    tasks={localTasks}
                    refreshUser={refreshUser}
                    fetchTasks={fetchTasks}
                    initialData={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={handleUpdateTask}
                />
            )}
            {showCategoryModal && (
                <ManageCategoriesModal
                    user={user}
                    tasks={tasks}
                    onClose={() => setShowCategoryModal(false)}
                    onUpdate={() => {
                        if (refreshUser) refreshUser();
                        if (fetchTasks) fetchTasks();
                    }}
                />
            )}
        </div>
    );
}
