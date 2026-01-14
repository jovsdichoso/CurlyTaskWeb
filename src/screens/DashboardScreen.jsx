import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TaskCard from '../components/TaskCard';
import AddTaskModal from '../components/AddTaskModal';
import ViewTaskModal from '../components/ViewTaskModal';
import DeleteModal from '../components/DeleteModal';
import ProfileModal from '../components/ProfileModal'; // <--- NEW IMPORT
import { Plus, Loader2, Menu } from 'lucide-react';

// Firebase Imports
import { db } from '../firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from 'firebase/firestore';

const DashboardScreen = () => {
    // --- STATE MANAGEMENT ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false); // <--- PROFILE STATE

    const [selectedTask, setSelectedTask] = useState(null);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial load from Local Storage
    const [tasks, setTasks] = useState(() => {
        const savedTasks = localStorage.getItem('cached_tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });

    const [loading, setLoading] = useState(() => {
        const savedTasks = localStorage.getItem('cached_tasks');
        return !savedTasks;
    });

    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const auth = getAuth();

    // 1. AUTH & DATA LISTENER
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const q = query(
                    collection(db, "tasks"),
                    where("userId", "==", currentUser.uid),
                    orderBy("createdAt", "desc")
                );

                const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const tasksData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setTasks(tasksData);
                    localStorage.setItem('cached_tasks', JSON.stringify(tasksData));
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching tasks:", error);
                    setLoading(false);
                });
                return () => unsubscribeSnapshot();
            } else {
                navigate('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [navigate]);

    // 2. ADD TASK 
    const handleSaveTask = async (taskData) => {
        if (!user) return;
        try {
            await addDoc(collection(db, "tasks"), {
                ...taskData,
                userId: user.uid,
                createdAt: new Date(),
                completed: false
            });
        } catch (error) {
            console.error("Error adding task: ", error);
            alert("Failed to save task.");
        }
    };

    // 3. DELETE LOGIC
    const promptDelete = (id) => {
        setTaskToDelete(id);
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, "tasks", taskToDelete));
            if (selectedTask?.id === taskToDelete) {
                setIsViewModalOpen(false);
            }
            setTaskToDelete(null);
        } catch (error) {
            console.error("Error deleting task: ", error);
            alert("Failed to delete task.");
        } finally {
            setIsDeleting(false);
        }
    };

    // 4. OPEN TASK DETAILS
    const handleOpenTask = (task) => {
        setSelectedTask(task);
        setIsViewModalOpen(true);
    };

    const handleUpdateTask = (updatedTask) => {
        setTasks(prevTasks => {
            const newTasks = prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
            localStorage.setItem('cached_tasks', JSON.stringify(newTasks));
            return newTasks;
        });
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden">

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onOpenProfile={() => setIsProfileOpen(true)} // <--- PASS HANDLER
            />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 mr-1 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 md:hidden"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard</h2>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-teal-600/20"
                    >
                        <Plus size={18} />
                        <span className="hidden md:inline">New Task</span>
                        <span className="md:hidden">New</span>
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                            Hello, {user?.displayName ? user.displayName.split(' ')[0] : "Builder"}.
                        </h1>
                        <p className="text-sm md:text-base text-gray-600 dark:text-zinc-400">
                            You have <span className="font-bold text-teal-600">{tasks.filter(t => !t.completed).length}</span> active tasks.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 size={40} className="animate-spin text-teal-600" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {tasks.map((task) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onDelete={promptDelete}
                                    onClick={() => handleOpenTask(task)}
                                />
                            ))}

                            {tasks.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl bg-gray-50/50 dark:bg-zinc-900/50">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                        <Plus size={32} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium">No tasks found.</p>
                                    <p className="text-gray-400 text-sm">Create one to get started!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- MODALS --- */}

                <AddTaskModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTask}
                />

                <ViewTaskModal
                    isOpen={isViewModalOpen}
                    onClose={() => setIsViewModalOpen(false)}
                    task={selectedTask}
                    onUpdate={handleUpdateTask}
                    onDelete={promptDelete}
                />

                <DeleteModal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    onConfirm={confirmDelete}
                    isDeleting={isDeleting}
                />

                {/* --- RENDER PROFILE MODAL --- */}
                <ProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                />
            </main>
        </div>
    );
};

export default DashboardScreen;