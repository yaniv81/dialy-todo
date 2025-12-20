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
    const [text, setText] = useState(initialData?.text || '');
    const [days, setDays] = useState(initialData?.days || []);
    const [doNotRepeat, setDoNotRepeat] = useState(false);
    const [repeatEveryOtherDay, setRepeatEveryOtherDay] = useState(false);

    // Initialize repeat toggle states based on initialData
    useEffect(() => {
        if (initialData) {
            if (!initialData.recurring) {
                setDoNotRepeat(true);
            } else if (initialData.frequency === 'everyOtherDay') {
                setRepeatEveryOtherDay(true);
            }
            // else standard recurring (days array)
        }
    }, [initialData]);

    // Category State
    const [showManageCategories, setShowManageCategories] = useState(false);
    const [category, setCategory] = useState(initialData?.category || '');
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [categoryColor, setCategoryColor] = useState('#3B82F6'); // Default Blue

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
        // If Do Not Repeat is on, prevent changing days
        if (doNotRepeat) return;

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
        if (!doNotRepeat && !repeatEveryOtherDay && days.length === 0) {
            return;
        }

        let frequency = 'weekly';
        let startDate = initialData?.startDate; // Keep existing start date if editing
        let isRecurring = !doNotRepeat;

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
            setDoNotRepeat(false);
            setDays([0, 2, 4, 6]);
        } else {
            setDays([]);
        }
    };

    const handleDoNotRepeatToggle = () => {
        const newValue = !doNotRepeat;
        setDoNotRepeat(newValue);

        if (newValue) {
            setRepeatEveryOtherDay(false);
            setDays([new Date().getDay()]);
        } else {
            setDays([]);
        }
    };

    const isValid = text.trim() && (doNotRepeat || repeatEveryOtherDay || days.length > 0);

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
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Category</label>
                            <div className="flex gap-2 mb-2">
                                <select
                                    value={isNewCategory ? '__NEW__' : category}
                                    onChange={(e) => {
                                        if (e.target.value === '__NEW__') {
                                            setIsNewCategory(true);
                                            setCategory('');
                                            const randomColor = '#' + [0, 0, 0].map(() => Math.floor(Math.random() * 160).toString(16).padStart(2, '0')).join('');
                                            setCategoryColor(randomColor);
                                        } else {
                                            setIsNewCategory(false);
                                            setCategory(e.target.value);
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">None</option>
                                    {user.categories && user.categories.map(c => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                    <option value="__NEW__">+ New Category</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowManageCategories(true)}
                                    className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    Manage
                                </button>
                            </div>
                            {isNewCategory && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Category Name"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                    <input
                                        type="color"
                                        value={categoryColor}
                                        onChange={(e) => setCategoryColor(e.target.value)}
                                        className="h-10 w-10 p-1 rounded cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Repeat every day</span>
                            <button
                                type="button"
                                onClick={() => {
                                    if (days.length === 7) {
                                        setDays([]);
                                    } else {
                                        setDays([0, 1, 2, 3, 4, 5, 6]);
                                        setDoNotRepeat(false);
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
                    </div>

                    <div className="mb-6">
                        <label className={`block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200`}>Repeat On <span className="text-red-500">*</span></label>
                        <div className="flex justify-between">
                            {dayNames.map((name, index) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => toggleDay(index)}
                                    disabled={doNotRepeat}
                                    className={`w-10 h-10 rounded-full text-xs font-bold transition 
                                        ${repeatEveryOtherDay ? 'opacity-55' : ''} 
                                        ${doNotRepeat ? (days.includes(index) ? 'opacity-100 cursor-not-allowed' : 'opacity-20 cursor-not-allowed') : ''}
                                        ${days.includes(index)
                                            ? (repeatEveryOtherDay ? 'bg-blue-500 text-white' : 'bg-green-500 text-white')
                                            : (repeatEveryOtherDay ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                                    `}
                                >
                                    {name.charAt(0)}
                                </button>
                            ))}
                        </div>
                        {(!doNotRepeat && !repeatEveryOtherDay && days.length === 0) && (
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
