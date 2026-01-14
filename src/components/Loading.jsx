import React from 'react';
import { Loader2 } from 'lucide-react';
import logo from '../assets/logo.svg';

const Loading = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors duration-700">
            {/* Logo Section */}
            <div className="mb-6 relative">
                <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full animate-pulse" />
                <img
                    src={logo}
                    alt="Loading..."
                    className="w-50 h-50 object-contain relative z-10 drop-shadow-lg"
                />
            </div>

            {/* Spinner & Text */}
            <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-teal-600 animate-spin" />
                <p className="text-sm font-semibold text-gray-500 dark:text-zinc-500 tracking-wider uppercase animate-pulse">
                    Loading Workspace...
                </p>
            </div>
        </div>
    );
};

export default Loading;