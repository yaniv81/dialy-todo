import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if device is iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Check if app is running in standalone mode (already installed)
        // We check this initially and can listen for changes if needed
        const checkStandalone = () => {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true;
            setIsStandalone(isStandaloneMode);
        };

        checkStandalone();

        // Listen for matchMedia changes (e.g. if installed while open)
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        try {
            // Modern browsers
            mediaQuery.addEventListener('change', checkStandalone);
        } catch (e) {
            // Fallback for older
            mediaQuery.addListener(checkStandalone);
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            console.log('beforeinstallprompt fired');
        };

        const handleAppInstalled = () => {
            setIsStandalone(true);
            setDeferredPrompt(null);
            console.log('App installed successfully');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            try {
                mediaQuery.removeEventListener('change', checkStandalone);
            } catch (e) {
                mediaQuery.removeListener(checkStandalone);
            }
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, discard it
        setDeferredPrompt(null);

        return outcome;
    };

    return {
        isSupported: !!deferredPrompt || isIOS, // True if we can offer an install flow (Android prompt or iOS manual)
        isInstalled: isStandalone,
        isIOS,
        deferredPrompt,
        promptInstall
    };
};
