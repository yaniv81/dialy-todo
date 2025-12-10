import React, { useState } from 'react';
import api from '../lib/axios';

export default function ManageTasks({ tasks, onClose, fetchTasks }) {
    // Local state for optimistic reordering?
    // We can just use props.tasks if we update parent or use local copy.
    const [localTasks, setLocalTasks] = useState([...tasks]);

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
        <div className="fixed inset-0 bg-white z-20 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Manage Tasks</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium"
                    >
                        Done
                    </button>
                </div>

                <div className="space-y-2">
                    {localTasks.map((task, index) => (
                        <div key={task.id} className="flex items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
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
                                <p className="font-medium text-gray-800">{task.text}</p>
                                <div className="flex gap-1 mt-1">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dIndex) => (
                                        <span
                                            key={day}
                                            className={`text-[10px] px-1.5 py-0.5 rounded ${task.days.includes(dIndex) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-300'}`}
                                        >
                                            {day}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(task.id)}
                                className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                                title="Delete Task"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                    {localTasks.length === 0 && <p className="text-center text-gray-500 py-8">No tasks to manage.</p>}
                </div>
            </div>
        </div>
    );
}
