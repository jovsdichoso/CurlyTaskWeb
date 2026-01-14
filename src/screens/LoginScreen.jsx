import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase'; 
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged,
    updateProfile 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { Loader2, AlertCircle, User, BookOpen, Heart } from 'lucide-react';
import logo from '../assets/logo.svg'; // <--- IMPORT LOGO

const LoginScreen = () => {
    const navigate = useNavigate();

    // Toggle between Login and Sign Up
    const [isLogin, setIsLogin] = useState(true); 
    
    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Extra Data for Sign Up
    const [username, setUsername] = useState('');
    const [course, setCourse] = useState('');
    const [hobbies, setHobbies] = useState('');

    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);
    const [error, setError] = useState('');

    // --- REDIRECT IF ALREADY LOGGED IN ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                navigate('/dashboard');
            } else {
                setAuthChecking(false);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // --- LOGIN LOGIC ---
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/dashboard');
            } else {
                // --- SIGN UP LOGIC ---
                // 1. Create Auth User
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 2. Update Auth Profile (Display Name)
                await updateProfile(user, {
                    displayName: username,
                    photoURL: "https://ui-avatars.com/api/?background=0D9488&color=fff&name=" + username
                });

                // 3. Save Custom Data to Firestore
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    username: username,
                    email: email,
                    course: course,
                    hobbies: hobbies,
                    emailVerified: user.emailVerified,
                    createdAt: new Date().toISOString(),
                    photoURL: user.photoURL || "",
                });

                navigate('/dashboard');
            }
        } catch (err) {
            if (err.code === 'auth/invalid-credential') {
                setError("Incorrect email or password.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("This email is already registered.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (authChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <Loader2 size={40} className="animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black transition-colors duration-300 py-10 px-4">
            <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800">

                {/* Header */}
                <div className="text-center mb-8">
                    <img 
                        src={logo} 
                        alt="CurlyTask Logo" 
                        className="w-50 h-50 mx-auto mb-4 object-contain" 
                    />
                    
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-gray-500 dark:text-zinc-400 mt-2 text-sm">
                        {isLogin ? 'Enter your credentials to access CurlyTask' : 'Join us and start organizing your life'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-4">
                    
                    {/* EXTRA FIELDS FOR SIGN UP */}
                    {!isLogin && (
                        <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium"
                                        placeholder="e.g., Papi"
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Course</label>
                                    <div className="relative">
                                        <BookOpen className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium text-sm"
                                            placeholder="BSIT"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Hobbies</label>
                                    <div className="relative">
                                        <Heart className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={hobbies}
                                            onChange={(e) => setHobbies(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium text-sm"
                                            placeholder="Coding"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STANDARD FIELDS */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all font-medium"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Please wait...</span>
                            </>
                        ) : (
                            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                        )}
                    </button>
                </form>

                {/* Toggle Sign In / Sign Up */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-teal-600 hover:text-teal-700 font-bold hover:underline transition-all"
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;