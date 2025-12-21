import React, { useState, useEffect } from 'react';
import api from '../lib/axios';

export default function ManageCategoriesModal({ user, tasks = [], onClose, onUpdate }) {
    const [categories, setCategories] = useState(user.categories || []);
    const [editingName, setEditingName] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [orphans, setOrphans] = useState([]);

    // Sync categories from user prop (only when user changes)
    useEffect(() => {
        setCategories(user.categories || []);
    }, [user]);

    // Calculate orphans (when tasks or user changes)
    useEffect(() => {
        if (tasks) {
            const definedNames = new Set((user.categories || []).map(c => c.name));
            const usedNames = new Set(tasks.map(t => t.category).filter(Boolean));
            const foundOrphans = [...usedNames].filter(name => !definedNames.has(name));
            setOrphans(foundOrphans);
        }
    }, [tasks, user]);

    const handleUpdate = async (originalName, newName, newColor) => {
        try {
            await api.patch(`/api/categories/${encodeURIComponent(originalName)}`, {
                newName,
                newColor
            });
            onUpdate(); // Trigger refresh of user/tasks
        } catch (err) {
            console.error('Failed to update category', err);
            alert('Failed to update category');
        }
    };

    const handleDelete = async (name) => {
        if (!confirm(`Are you sure you want to delete the category "${name}"? Tasks will lose this category.`)) return;

        try {
            await api.delete(`/api/categories/${encodeURIComponent(name)}`);
            // Optimistic update
            setCategories(prev => prev.filter(c => c.name !== name));
            setOrphans(prev => prev.filter(o => o !== name));
            onUpdate();
        } catch (err) {
            console.error('Failed to delete category', err);
            alert('Failed to delete category');
        }
    };

    const renderCategoryRow = (name, color, isOrphan = false) => (
        <div key={name} className={`flex items-center gap-3 p-2 rounded ${isOrphan ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
            <div className="relative group">
                <button
                    className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                        // Toggle a simple dropdown or just cycling?
                        // A dropdown is better for 10+ colors.
                        // For simplicity, let's just show the palette below or uses a standard behavior
                        // But since we need a custom UI, let's make it a popover or a simple row if space permits.
                        // Let's go with a simple click-to-cycle or a small grid. 
                        // Given the instructions, let's make a small popover grid or just a row of circles if not too many.
                        // Let's stick to a predefined "Picker" component logic inline for now or a simple dropdown.
                    }}
                >
                </button>
                {/* Simple hover/focus based picker for now, or we can make it explicit state if needed. 
                    Let's use a hidden peer or just a simple state in the parent? 
                    Actually, let's keep it simple: Just show the swatch. When clicked, show a small absolute div with options.
                */}
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-1 z-50 hidden group-hover:block transition-opacity">
                    {[
                        '#1f2937', '#111827', // Gray 800, 900
                        '#b91c1c', '#991b1b', // Red 700, 800
                        '#c2410c', '#9a3412', // Orange 700, 800
                        '#b45309', '#92400e', // Amber 700, 800
                        '#15803d', '#166534', // Green 700, 800
                        '#0e7490', '#155e75', // Cyan 700, 800
                        '#1d4ed8', '#1e40af', // Blue 700, 800
                        '#4338ca', '#3730a3', // Indigo 700, 800
                        '#7e22ce', '#6b21a8', // Purple 700, 800
                        '#be185d', '#9d174d'  // Pink 700, 800
                    ].map(c => (
                        <button
                            key={c}
                            className={`w-6 h-6 rounded-full hover:scale-110 transition ${c === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                                if (c !== color || isOrphan) {
                                    handleUpdate(name, null, c);
                                }
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="flex-1">
                {editingName === name ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                            if (editValue.trim() && editValue !== name) {
                                handleUpdate(name, editValue, null);
                            }
                            setEditingName(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.target.blur();
                            }
                        }}
                        autoFocus
                        className="w-full px-2 py-1 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                ) : (
                    <span
                        onClick={() => {
                            setEditingName(name);
                            setEditValue(name);
                        }}
                        className="block w-full px-2 py-1 cursor-pointer hover:bg-black/5 rounded dark:hover:bg-white/10"
                    >
                        {name} {isOrphan && <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">(Unsaved)</span>}
                    </span>
                )}
            </div>

            <button
                onClick={() => handleDelete(name)}
                className="p-1 text-red-500 hover:bg-red-50 rounded dark:hover:bg-red-900/30"
                title="Delete Category"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 text-gray-800 dark:text-gray-100">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Manage Categories</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        {categories.length === 0 && orphans.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No categories found.</p>
                        )}
                        {categories.map((cat) => renderCategoryRow(cat.name, cat.color, false))}
                    </div>

                    {orphans.length > 0 && (
                        <div className="border-t pt-4 dark:border-gray-700">
                            <h4 className="text-sm font-semibold text-gray-500 mb-2 dark:text-gray-400">Found in Tasks (Unsaved)</h4>
                            <div className="space-y-2">
                                {orphans.map(name => renderCategoryRow(name, '#9ca3af', true))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Done</button>
                </div>
            </div>
        </div>
    );
}
