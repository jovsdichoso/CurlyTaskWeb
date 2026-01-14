import React, { useState, useEffect } from 'react';
import { Home, CheckSquare, Settings, Moon, Sun, LogOut, User, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // <--- Import Firestore
import { db } from '../firebase'; // <--- Import DB
import logo from '../assets/logo.svg';

const Sidebar = ({ isOpen, onClose, onOpenProfile }) => {
    // Theme Logic
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark' || savedTheme === null;
    });

    const [user, setUser] = useState(null);
    const [profileData, setProfileData] = useState(null); // <--- New State for DB Data

    const navigate = useNavigate();
    const location = useLocation();
    const auth = getAuth();

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // --- FIX: Fetch Profile from Firestore ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // Fetch the real data from "users" collection
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        setProfileData(docSnap.data());
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setProfileData(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const handleLogout = async () => {
        localStorage.removeItem('cached_tasks');
        await signOut(auth);
        navigate('/login');
    };

    // Helper to pick the best display name/photo
    const displayName = profileData?.username || user?.displayName || 'User';
    const displayPhoto = profileData?.photoURL || user?.photoURL;
    const displayEmail = profileData?.email || user?.email;

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 
                    flex flex-col transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Logo Area */}
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src={logo}
                            alt="CurlyTask Logo"
                            className="w-10 h-10 object-contain"
                        />
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white leading-none">CurlyTask</h1>
                            <span className="text-xs text-gray-500 font-medium">Workspace</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-4 space-y-2">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">Menu</p>
                    <NavItem
                        icon={<Home size={20} />}
                        label="Dashboard"
                        isActive={location.pathname === '/dashboard'}
                        onClick={() => { navigate('/dashboard'); onClose(); }}
                    />
                    <NavItem
                        icon={<Settings size={20} />}
                        label="Profile"
                        isActive={false}
                        onClick={() => { onOpenProfile(); onClose(); }}
                    />
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-gray-200 dark:border-zinc-800">

                    {/* CLICKABLE USER CARD */}
                    <button
                        onClick={onOpenProfile}
                        className="w-full flex items-center gap-3 p-3 mb-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 overflow-hidden shrink-0">
                            {displayPhoto ? (
                                <img src={displayPhoto} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {displayName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                {displayEmail}
                            </p>
                        </div>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            <span className="text-xs font-bold">{isDarkMode ? 'Light' : 'Dark'}</span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut size={18} />
                            <span className="text-xs font-bold">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

const NavItem = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative
        ${isActive
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900'
            }`}
    >
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-teal-600 rounded-r-full" />
        )}
        <span className={isActive ? 'text-teal-600 dark:text-teal-400' : 'group-hover:text-gray-900 dark:group-hover:text-zinc-200'}>
            {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
    </button>
);

export default Sidebar;