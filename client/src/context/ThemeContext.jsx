import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// Helper to set a cookie
function setCookie(name, value, days) {
    if (typeof document === 'undefined') return;
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // SameSite=Lax for general security, path=/ for global access
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

// Helper to get a cookie
function getCookie(name) {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

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
        setCookie('theme', theme, 365);
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
