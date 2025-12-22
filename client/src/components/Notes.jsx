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
            fetchNotes();
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {notes.map(note => (
                            <div key={note._id} className="bg-yellow-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-yellow-200 dark:border-gray-700 flex flex-col h-48 transition hover:shadow-md relative group">
                                {note.title && (
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2 truncate">
                                        {note.title}
                                    </h3>
                                )}
                                <p className={`text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap overflow-hidden flex-1 ${!note.title ? 'font-medium text-base pt-2' : ''}`}>
                                    {note.content}
                                </p>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
                                    <button
                                        onClick={() => openEdit(note)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-l-md"
                                        title="Edit"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <div className="w-px bg-gray-200 dark:bg-gray-600"></div>
                                    <button
                                        onClick={() => handleDelete(note._id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-gray-600 rounded-r-md"
                                        title="Delete"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                                <div className="mt-2 text-xs text-gray-400 text-right">
                                    {new Date(note.updatedAt).toLocaleDateString()}
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
