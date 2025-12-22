import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`
                relative w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none
                ${isDark ? 'bg-slate-700' : 'bg-sky-200'}
                ${className}
            `}
            aria-label="Toggle Dark Mode"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {/* Sun Icon (Visible when Dark - on the left side background) */}
            {/* Actually standard toggle puts icons on track. Let's put meaningful icons. 
                When knob is Left (Light), right side is empty?
                Let's put icons in background: Sun on Left, Moon on Right.
            */}

            <span className={`absolute left-1.5 transition-opacity duration-300 ${isDark ? 'opacity-50' : 'opacity-100 text-yellow-600'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
            </span>

            <span className={`absolute right-1.5 transition-opacity duration-300 ${isDark ? 'opacity-100 text-indigo-200' : 'opacity-50'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
            </span>

            {/* Thumb */}
            <div
                className={`
                    bg-white w-5 h-5 rounded-full shadow-md z-10 transform transition-transform duration-300 ease-in-out
                    ${isDark ? 'translate-x-7' : 'translate-x-0'}
                `}
            />
        </button>
    );
}
