import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCookie, setCookie } from '../lib/cookie';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Check cookie first, default to light
        if (typeof window !== 'undefined') {
            const savedTheme = getCookie('theme');
            return savedTheme || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove both to start clean
        root.classList.remove('light', 'dark');
        // Add current theme
        root.classList.add(theme);
        // Persist to cookie (1 year expiry)
        setCookie('theme', theme, 30);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
