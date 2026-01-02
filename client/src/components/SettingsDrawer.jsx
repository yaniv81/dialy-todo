import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';

export default function SettingsDrawer({ isOpen, onClose, user, refreshUser }) {
    const [settings, setSettings] = useState({
        defaultRepeatEveryDay: false,
        defaultRepeatEveryOtherDay: false,
        hideCategories: false
    });

    useEffect(() => {
        if (user && user.settings) {
            setSettings({
                defaultRepeatEveryDay: user.settings.defaultRepeatEveryDay || false,
                defaultRepeatEveryOtherDay: user.settings.defaultRepeatEveryOtherDay || false,
                hideCategories: user.settings.hideCategories || false
            });
        }
    }, [user]);

    const handleToggle = async (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };

        // Mutual exclusivity logic
        if (key === 'defaultRepeatEveryDay' && newSettings.defaultRepeatEveryDay) {
            newSettings.defaultRepeatEveryOtherDay = false;
        }
        if (key === 'defaultRepeatEveryOtherDay' && newSettings.defaultRepeatEveryOtherDay) {
            newSettings.defaultRepeatEveryDay = false;
        }

        setSettings(newSettings); // Optimistic update

        try {
            await api.patch('/api/user/settings', newSettings);
            refreshUser();
        } catch (err) {
            console.error('Failed to save settings', err);
            // Revert on error? Or just let refreshUser sync it next time.
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-xl z-50 p-6 flex flex-col"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white">Settings</h2>
                                {user && <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{user.email}</p>}
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
                                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Task Defaults</h3>

                            {/* Repeat Every Day Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 dark:text-gray-300">Repeat every day</span>
                                <button
                                    onClick={() => handleToggle('defaultRepeatEveryDay')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.defaultRepeatEveryDay ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${settings.defaultRepeatEveryDay ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Repeat Every Other Day Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 dark:text-gray-300">Repeat every other day</span>
                                <button
                                    onClick={() => handleToggle('defaultRepeatEveryOtherDay')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.defaultRepeatEveryOtherDay ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${settings.defaultRepeatEveryOtherDay ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Appearance</h3>

                            {/* Hide Category Section Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 dark:text-gray-300">Hide category section</span>
                                <button
                                    onClick={() => handleToggle('hideCategories')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.hideCategories ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${settings.hideCategories ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto text-xs text-gray-400 text-center">
                            Daily Flow v1.0
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
