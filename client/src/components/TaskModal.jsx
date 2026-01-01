import React, { useState, useEffect } from 'react';
import ManageCategoriesModal from './ManageCategoriesModal';

const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function TaskModal({ user, tasks = [], onClose, onSave, initialData = null, refreshUser, fetchTasks }) {
    // Initialize state directly from props to avoid flash
    const [text, setText] = useState(initialData?.text || '');

    // Calculate initial values for toggles
    const getInitialDays = () => {
        if (initialData) return initialData.days || [];
        if (user?.settings?.defaultRepeatEveryDay) return [0, 1, 2, 3, 4, 5, 6];
        if (user?.settings?.defaultRepeatEveryOtherDay) return [0, 2, 4, 6];
        return [];
    };

    const getInitialRepeatEveryOtherDay = () => {
        if (initialData) return initialData.frequency === 'everyOtherDay';
        return user?.settings?.defaultRepeatEveryOtherDay || false;
    };

    const [days, setDays] = useState(getInitialDays);
    const [repeatEveryOtherDay, setRepeatEveryOtherDay] = useState(getInitialRepeatEveryOtherDay);

    // Category State
    const [showManageCategories, setShowManageCategories] = useState(false);
    const [category, setCategory] = useState(initialData?.category || '');
    const [isNewCategory, setIsNewCategory] = useState(false);
    // Dark palette for new categories
    const DARK_PALETTE = [
        '#1f2937', '#111827', '#b91c1c', '#991b1b', '#c2410c', '#9a3412',
        '#b45309', '#92400e', '#15803d', '#166534', '#0e7490', '#155e75',
        '#1d4ed8', '#1e40af', '#4338ca', '#3730a3', '#7e22ce', '#6b21a8',
        '#be185d', '#9d174d'
    ];
    const [categoryColor, setCategoryColor] = useState(DARK_PALETTE[Math.floor(Math.random() * DARK_PALETTE.length)]);

    // If editing a task with a category, try to find its color if accessible (though user prop has categories)
    useEffect(() => {
        if (!isNewCategory && category && user.categories) {
            const found = user.categories.find(c => c.name === category);
            if (found) {
                setCategoryColor(found.color);
            }
        }
    }, [category, user.categories, isNewCategory]);

    // Alert State
    const [alertEnabled, setAlertEnabled] = useState(initialData?.alertEnabled || false);
    const [alertTime, setAlertTime] = useState(initialData?.alertTime || '');
    const [alertMode, setAlertMode] = useState(initialData?.alertMode || 'both');

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (index) => {
        // Turning off special modes if user manually selects days
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

        // Validation: Must select days unless special modes
        if (!repeatEveryOtherDay && days.length === 0) {
            return;
        }

        let frequency = 'weekly';
        let startDate = initialData?.startDate; // Keep existing start date if editing
        let isRecurring = true; // Always recurring now, basically

        if (repeatEveryOtherDay) {
            frequency = 'everyOtherDay';
            if (!startDate) startDate = getLocalDateStr();
        }

        // Prepare data object
        const taskData = {
            text,
            days,
            recurring: isRecurring,
            frequency,
            startDate,
            alertEnabled,
            alertTime,
            alertMode,
            category: isNewCategory ? category : (category || undefined), // If empty string, send undefined/null?
            categoryColor: isNewCategory ? categoryColor : undefined // Only send color if new
        };

        onSave(taskData);
    };

    const handleEveryOtherDayToggle = () => {
        const newValue = !repeatEveryOtherDay;
        setRepeatEveryOtherDay(newValue);

        if (newValue) {
            setDays([0, 2, 4, 6]);
        } else {
            setDays([]);
        }
    };

    const isValid = text.trim() && (repeatEveryOtherDay || days.length > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 dark:bg-gray-800 dark:text-white max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{initialData ? 'Edit Task' : 'Add New Task'}</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none mb-4 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="What needs to be done?"
                        value={text}
                        autoFocus={!initialData && typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches}
                        onChange={(e) => setText(e.target.value)}
                    />

                    <div className="space-y-3 mb-6">
                        {/* Category Selection */}
                        {(!user?.settings?.hideCategories) && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Category</label>

                                {!isNewCategory ? (
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">None</option>
                                            {user.categories && user.categories.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewCategory(true);
                                                setCategory('');
                                                // Pick a random dark color not already in use if possible
                                                const usedColors = new Set((user.categories || []).map(c => c.color));
                                                const available = DARK_PALETTE.filter(c => !usedColors.has(c));
                                                const nextColor = available.length > 0
                                                    ? available[Math.floor(Math.random() * available.length)]
                                                    : DARK_PALETTE[Math.floor(Math.random() * DARK_PALETTE.length)];
                                                setCategoryColor(nextColor);
                                            }}
                                            className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 whitespace-nowrap"
                                        >
                                            + Add Category
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 mb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">New Category</span>
                                            <button
                                                type="button"
                                                onClick={() => { setIsNewCategory(false); setCategory(''); }}
                                                className="text-xs text-red-500 hover:text-red-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    className="w-10 h-10 rounded border border-gray-300 shadow-sm flex-shrink-0"
                                                    style={{ backgroundColor: categoryColor }}
                                                />
                                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl rounded-lg p-2 grid grid-cols-5 gap-1 z-50 hidden group-hover:grid w-[180px]">
                                                    {DARK_PALETTE.map(c => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            className={`w-6 h-6 rounded-full hover:scale-110 transition ${c === categoryColor ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                                            style={{ backgroundColor: c }}
                                                            onClick={() => setCategoryColor(c)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Category Name"
                                                value={category}
                                                onChange={(e) => setCategory(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Repeat every day</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (days.length === 7) {
                                        setDays([]);
                                    } else {
                                        setDays([0, 1, 2, 3, 4, 5, 6]);
                                        setRepeatEveryOtherDay(false);
                                    }
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${days.length === 7 ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${days.length === 7 ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

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

                    </div>

                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200`}>Repeat On <span className="text-red-500">*</span></label>
                        <div className="flex justify-between">
                            {dayNames.map((name, index) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => toggleDay(index)}
                                    className={`w-10 h-10 rounded-full text-xs font-bold transition 
                                        ${days.includes(index)
                                            ? (repeatEveryOtherDay ? 'bg-purple-600 text-white' : 'bg-green-500 text-white')
                                            : (repeatEveryOtherDay ? 'bg-orange-400 text-white opacity-80' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600')}
                                    `}
                                >
                                    {name.charAt(0)}
                                </button>
                            ))}
                        </div>
                        {(!repeatEveryOtherDay && days.length === 0) && (
                            <p className="text-xs text-red-500 mt-2">Please select at least one day.</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                        <button type="submit" disabled={!isValid} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md cursor-pointer dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            {initialData ? 'Save Changes' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </div>
            {showManageCategories && (
                <ManageCategoriesModal
                    user={user}
                    tasks={tasks}
                    onClose={() => setShowManageCategories(false)}
                    onUpdate={() => {
                        if (refreshUser) refreshUser();
                        if (fetchTasks) fetchTasks();
                    }}
                />
            )}
        </div>
    );
}
