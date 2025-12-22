import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import NoteModal from './NoteModal';

export default function Notes({ onClose }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    const fetchNotes = async () => {
        try {
            const res = await api.get('/api/notes');
            setNotes(res.data);
        } catch (err) {
            console.error('Failed to fetch notes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const handleSave = async (data) => {
        try {
            if (editingNote) {
                await api.patch(`/api/notes/${editingNote._id}`, data);
            } else {
                await api.post('/api/notes', data);
            }
            setShowModal(false);
            setEditingNote(null);
            fetchNotes(); // Fetch to get correct order/id
        } catch (err) {
            console.error('Save note failed', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await api.delete(`/api/notes/${id}`);
            fetchNotes();
        } catch (err) {
            console.error('Delete note failed', err);
        }
    };

    const moveNote = async (index, direction) => {
        const newNotes = [...notes];
        if (direction === 'up' && index > 0) {
            [newNotes[index], newNotes[index - 1]] = [newNotes[index - 1], newNotes[index]];
        } else if (direction === 'down' && index < newNotes.length - 1) {
            [newNotes[index], newNotes[index + 1]] = [newNotes[index + 1], newNotes[index]];
        } else {
            return;
        }
        setNotes(newNotes);

        try {
            await api.patch('/api/notes/reorder/batch', { noteIds: newNotes.map(n => n._id) });
        } catch (err) {
            console.error('Reorder note failed', err);
            fetchNotes(); // Revert on failure
        }
    };

    const openEdit = (note) => {
        setEditingNote(note);
        setShowModal(true);
    };

    const openAdd = () => {
        setEditingNote(null);
        setShowModal(true);
    };

    return (
        <div className="fixed inset-0 bg-white z-20 overflow-y-auto dark:bg-gray-900">
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">my notes</h2>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        Done
                    </button>
                </div>

                <div className="flex justify-end mb-6">
                    <button
                        onClick={openAdd}
                        className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-md flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Note
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading notes...</div>
                ) : notes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                        No notes yet. Start writing!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {notes.map((note, index) => (
                            <div key={note._id} className="bg-yellow-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-yellow-200 dark:border-gray-700 flex items-start gap-3 transition hover:shadow-md group">
                                <div className="flex flex-col gap-1 mt-1">
                                    <button
                                        onClick={() => moveNote(index, 'up')}
                                        disabled={index === 0}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-yellow-100/50 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                        title="Move Up"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                    </button>
                                    <button
                                        onClick={() => moveNote(index, 'down')}
                                        disabled={index === notes.length - 1}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-yellow-100/50 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                                        title="Move Down"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0 py-2">
                                    <p className="text-gray-700 dark:text-gray-200 text-base whitespace-pre-wrap break-words leading-relaxed">
                                        {note.content}
                                    </p>
                                    <div className="mt-2 text-xs text-gray-400">
                                        {new Date(note.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-2">
                                    <button
                                        onClick={() => openEdit(note)}
                                        className="p-3 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg bg-white dark:bg-gray-700/50 shadow-sm border border-gray-100 dark:border-gray-600"
                                        title="Edit"
                                        aria-label="Edit Note"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(note._id)}
                                        className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg bg-white dark:bg-gray-700/50 shadow-sm border border-gray-100 dark:border-gray-600"
                                        title="Delete"
                                        aria-label="Delete Note"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <NoteModal
                    initialData={editingNote}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
