import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const PWAInstallPrompt = () => {
    const { isSupported, isInstalled, isIOS, promptInstall } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Did the user already dismiss usage?
        const isDismissed = localStorage.getItem('pwa_install_dismissed') === 'true';

        // Show if:
        // 1. Not already installed
        // 2. Not dismissed by user
        // 3. Supported (either we have a prompt for Android/Desktop OR it is iOS)
        if (!isInstalled && !isDismissed && isSupported) {
            setIsVisible(true);
        }
    }, [isSupported, isInstalled]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_install_dismissed', 'true');
    };

    const handleInstallClick = () => {
        if (isIOS) {
            // Usually shouldn't be clickable for iOS as we show instructions, 
            // but just in case we have a button there.
        } else {
            promptInstall();
            // We can optionally hide it after click, but the prompt itself will take over.
            // If the user accepts, 'appinstalled' in hook triggers and updates isInstalled -> hides this.
            // If they cancel, we might want to keep it or hide it? Let's keep it visible until dismissed.
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                        Install App
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {isIOS
                            ? "Install this application on your home screen for quick and easy access."
                            : "Install this app for a better experience with offline access."}
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            {isIOS ? (
                <div className="mt-3 text-sm bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 mb-2">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 font-bold text-xs">1</span>
                        <span>Tap the <span className="font-semibold">Share</span> icon</span>
                        <span className="inline-flex items-center justify-center p-1 bg-gray-200 dark:bg-slate-600 rounded mx-1">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                        <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400 font-bold text-xs">2</span>
                        <span>Select <span className="font-semibold">Add to Home Screen</span></span>
                        <span className="inline-flex items-center justify-center p-1 bg-gray-200 dark:bg-slate-600 rounded mx-1">
                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        </span>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleInstallClick}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.98]"
                >
                    Install App
                </button>
            )}
        </div>
    );
};

export default PWAInstallPrompt;
