import React, { useState, useEffect } from 'react';
import {
    X, Calendar, CheckSquare, Trash2, Save, ExternalLink,
    Plus, FileText, Brain, Hash, Layout, Clock
} from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import QuizComponent from './QuizComponent';

const ViewTaskModal = ({ isOpen, onClose, task, onUpdate, onDelete }) => {
    if (!isOpen || !task) return null;

    const [activeTab, setActiveTab] = useState('details');

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [checklist, setChecklist] = useState(task.checklist || []);
    const [newItem, setNewItem] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState([]);

    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description);
        setChecklist(task.checklist || []);
        setIsEditing(false);
        setActiveTab('details');

        if (task.quizDataJson) {
            try {
                const parsed = typeof task.quizDataJson === "string"
                    ? JSON.parse(task.quizDataJson)
                    : task.quizDataJson;
                setQuizQuestions(Array.isArray(parsed) ? parsed : parsed.questions || []);
            } catch (e) {
                setQuizQuestions([]);
            }
        } else {
            setQuizQuestions([]);
        }
    }, [task]);

    // Checklist Logic
    const addChecklistItem = () => {
        if (!newItem.trim()) return;
        setChecklist([...checklist, { title: newItem, isChecked: false }]);
        setNewItem("");
        setIsEditing(true);
    };

    const toggleCheckItem = (index) => {
        const newChecklist = [...checklist];
        newChecklist[index].isChecked = !newChecklist[index].isChecked;
        setChecklist(newChecklist);
        setIsEditing(true);
    };

    const deleteCheckItem = (index) => {
        setChecklist(checklist.filter((_, i) => i !== index));
        setIsEditing(true);
    };

    // Save Logic
    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            const updates = { title, description, checklist };
            await updateDoc(doc(db, "tasks", task.id), updates);
            onUpdate({ ...task, ...updates });
            setIsEditing(false);
            onClose();
        } catch (error) {
            alert("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        onDelete(task.id);
    }

    const getCatColor = (c) => {
        switch (c) {
            case 'Work': return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900';
            case 'Personal': return 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-900';
            case 'Academic': return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    // Helper to render the correct FLAT icon based on type
    const renderIcon = () => {
        if (task.emoji === 'brain') {
            return <Brain size={32} className="text-pink-500" />;
        } else if (task.emoji === 'document-text') {
            return <FileText size={32} className="text-teal-600" />;
        } else {
            return <Layout size={32} className="text-gray-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-3xl rounded-[24px] shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden transition-all">

                {/* 1. Header Section */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-start gap-4 bg-white dark:bg-zinc-950 shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center border border-gray-100 dark:border-zinc-800 shrink-0 shadow-sm">
                        {renderIcon()}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setIsEditing(true); }}
                            className="w-full text-lg font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 p-0 focus:ring-0 truncate"
                            placeholder="Task Title"
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${getCatColor(task.category)}`}>
                                {task.category}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-gray-100 dark:border-zinc-800">
                                <Calendar size={10} /> {task.dueDate || "No Date"}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 dark:text-zinc-600 px-1">
                                <Hash size={10} /> {task.id.slice(0, 6).toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Tabs */}
                {quizQuestions.length > 0 && (
                    <div className="px-6 border-b border-gray-100 dark:border-zinc-800 flex gap-6 shrink-0 bg-gray-50/50 dark:bg-zinc-900/50">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'details' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
                        >
                            Task Details
                        </button>
                        <button
                            onClick={() => setActiveTab('quiz')}
                            className={`py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'quiz' ? 'text-pink-600 border-pink-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
                        >
                            <Brain size={14} /> AI Quiz
                        </button>
                    </div>
                )}

                {/* 3. Main Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-zinc-950">
                    {activeTab === 'details' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => { setDescription(e.target.value); setIsEditing(true); }}
                                    className="w-full min-h-[100px] bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-3 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all resize-none"
                                    placeholder="No details provided."
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Checklist</label>
                                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded">
                                        {checklist.filter(i => i.isChecked).length}/{checklist.length}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                        className="flex-1 bg-gray-50 dark:bg-zinc-900 rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-zinc-800 focus:border-teal-500 outline-none transition-all"
                                        placeholder="Add a subtask..."
                                    />
                                    <button onClick={addChecklistItem} className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shadow-lg shadow-teal-600/20">
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    {checklist.map((item, index) => (
                                        <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg group transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-800">
                                            <button
                                                onClick={() => toggleCheckItem(index)}
                                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${item.isChecked ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300 hover:border-teal-500'}`}
                                            >
                                                {item.isChecked && <CheckSquare size={10} />}
                                            </button>
                                            <span className={`text-xs flex-1 leading-relaxed ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-zinc-300'}`}>
                                                {item.title}
                                            </span>
                                            <button onClick={() => deleteCheckItem(index)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {checklist.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No checklist items yet.</p>}
                                </div>
                            </div>

                            {(task.pdfUrl || task.hasAttachment) && (
                                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Attachment</label>
                                    <a
                                        href={task.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30 hover:bg-teal-100 dark:hover:bg-teal-900/20 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-teal-900 flex items-center justify-center text-teal-600 shadow-sm">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-teal-900 dark:text-teal-100 line-clamp-1">{task.pdfName || "Document"}</span>
                                                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">PDF Document</span>
                                            </div>
                                        </div>
                                        <ExternalLink size={14} className="text-teal-400 group-hover:text-teal-600" />
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'quiz' && (
                        <div className="h-full">
                            <QuizComponent
                                task={task}
                                questions={quizQuestions}
                                onUpdate={onUpdate}
                            />
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 flex justify-between items-center shrink-0">
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors font-bold text-[10px] uppercase tracking-wide"
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            Close
                        </button>
                        {isEditing && activeTab === 'details' && (
                            <button
                                onClick={handleSaveChanges}
                                disabled={loading}
                                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-teal-600/20 flex items-center gap-1.5 transition-all disabled:opacity-70"
                            >
                                {loading ? "Saving..." : <><Save size={14} /> Save</>}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ViewTaskModal;