import React, { useState, useEffect } from 'react';
import {
    X, Save, ExternalLink, Trash2, Plus,
    FileText, Brain, Hash, Layout, PenTool,
    ChevronLeft, ChevronRight, Columns, Maximize,
    ToggleLeft, ToggleRight
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import QuizComponent from './QuizComponent';
import CanvasNote from './CanvasNote';

const ViewTaskModal = ({ isOpen, onClose, task, onUpdate, onDelete }) => {
    if (!isOpen || !task) return null;

    const [activeTab, setActiveTab] = useState('details');

    // --- NEW: MODE TOGGLE ---
    const [isStudyMode, setIsStudyMode] = useState(false); // Default to FALSE (Preview only)
    const [viewMode, setViewMode] = useState('notes');
    const [isSplitView, setIsSplitView] = useState(false);

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description); // Text Description
    const [checklist, setChecklist] = useState(task.checklist || []);
    const [newItem, setNewItem] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Pagination State for Canvas
    const [notePages, setNotePages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);

    const [quizQuestions, setQuizQuestions] = useState([]);
    const hasPdf = !!(task.pdfUrl || task.hasAttachment);

    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description);
        setChecklist(task.checklist || []);
        setIsEditing(false);
        setActiveTab('details');

        // Reset Modes
        setIsStudyMode(false); // Always start in "Preview" mode
        setViewMode('notes');
        setIsSplitView(false);

        // Load Canvas Pages
        let initialPages = [];
        if (task.notePages && Array.isArray(task.notePages)) {
            initialPages = task.notePages;
        } else if (task.notesSketch) {
            initialPages = [task.notesSketch];
        } else {
            initialPages = [null];
        }
        setNotePages(initialPages);
        setCurrentPage(0);

        if (task.quizDataJson) {
            try {
                const parsed = typeof task.quizDataJson === "string" ? JSON.parse(task.quizDataJson) : task.quizDataJson;
                setQuizQuestions(Array.isArray(parsed) ? parsed : parsed.questions || []);
            } catch (e) {
                setQuizQuestions([]);
            }
        }
    }, [task]);

    // Canvas Handlers
    const handlePageSave = (dataUrl) => {
        const updatedPages = [...notePages];
        updatedPages[currentPage] = dataUrl;
        setNotePages(updatedPages);
        setIsEditing(true);
    };

    const handleNextPage = () => {
        if (currentPage === notePages.length - 1) setNotePages([...notePages, null]);
        setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 0) setCurrentPage(prev => prev - 1);
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            const updates = {
                title,
                description, // Save text description
                checklist,
                notePages // Save canvas pages
            };
            await updateDoc(doc(db, "tasks", task.id), updates);
            onUpdate({ ...task, ...updates });
            setIsEditing(false);
        } catch (error) {
            alert("Failed to save changes");
        } finally {
            setLoading(false);
        }
    };

    const addChecklistItem = () => {
        if (!newItem.trim()) return;
        setChecklist([...checklist, { title: newItem, isChecked: false }]);
        setNewItem("");
        setIsEditing(true);
    };

    const deleteCheckItem = (index) => {
        setChecklist(checklist.filter((_, i) => i !== index));
        setIsEditing(true);
    };

    const toggleCheckItem = (index) => {
        const newChecklist = [...checklist];
        newChecklist[index].isChecked = !newChecklist[index].isChecked;
        setChecklist(newChecklist);
        setIsEditing(true);
    };

    const handleDelete = () => onDelete(task.id);

    const getCatColor = (c) => {
        switch (c) {
            case 'Work': return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900';
            case 'Personal': return 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-900';
            case 'Academic': return 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-900';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const renderIcon = () => {
        if (task.emoji === 'brain') return <Brain size={32} className="text-pink-500" />;
        else if (task.emoji === 'document-text') return <FileText size={32} className="text-teal-600" />;
        else return <Layout size={32} className="text-gray-500" />;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-white dark:bg-zinc-950 w-full max-w-[95vw] h-[95vh] rounded-[24px] shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col overflow-hidden transition-all duration-300">

                {/* --- 1. HEADER --- */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0 z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center border border-gray-100 dark:border-zinc-800 shrink-0 shadow-sm">
                            {renderIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => { setTitle(e.target.value); setIsEditing(true); }}
                                className="w-full text-lg font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 p-0 focus:ring-0 truncate"
                                placeholder="Task Title"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${getCatColor(task.category)}`}>
                                    {task.category}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-mono text-gray-400 dark:text-zinc-600 px-1">
                                    <Hash size={10} /> {task.id.slice(0, 6).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* STUDY MODE TOGGLE (Key Feature) */}
                    <button
                        onClick={() => setIsStudyMode(!isStudyMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 mr-2
                            ${isStudyMode
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400'
                            }`}
                    >
                        {isStudyMode ? <ToggleRight size={20} className="text-indigo-600 dark:text-indigo-400" /> : <ToggleLeft size={20} />}
                        <span className="text-xs font-bold">{isStudyMode ? 'Study Mode ON' : 'Preview Mode'}</span>
                    </button>

                    {/* Additional View Controls (Only visible in Study Mode) */}
                    {isStudyMode && hasPdf && (
                        <div className="flex items-center gap-2 border-l border-gray-200 dark:border-zinc-800 pl-4">
                            <button onClick={() => setIsSplitView(!isSplitView)} className={`p-2 rounded-xl border transition-all ${isSplitView ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-white border-gray-200 text-gray-400'}`}>
                                {isSplitView ? <Maximize size={16} /> : <Columns size={16} />}
                            </button>
                        </div>
                    )}

                    {/* ACTIONS */}
                    <div className="flex items-center gap-2 pl-4">
                        {isEditing && (
                            <button onClick={handleSaveChanges} disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5 transition-all">
                                {loading ? "Saving..." : <><Save size={14} /> Save</>}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* --- 2. TABS --- */}
                {quizQuestions.length > 0 && (
                    <div className="px-6 border-b border-gray-100 dark:border-zinc-800 flex gap-6 shrink-0 bg-gray-50/50 dark:bg-zinc-900/50">
                        <button onClick={() => setActiveTab('details')} className={`py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'details' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>Task Details</button>
                        <button onClick={() => setActiveTab('quiz')} className={`py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'quiz' ? 'text-pink-600 border-pink-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}><Brain size={14} /> AI Quiz</button>
                    </div>
                )}

                {/* --- 3. CONTENT AREA --- */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950 relative flex flex-col">

                    {activeTab === 'quiz' ? (
                        <div className="h-full overflow-y-auto p-6"><QuizComponent task={task} questions={quizQuestions} onUpdate={onUpdate} /></div>
                    ) : (
                        // IF STUDY MODE IS ON -> SHOW COMPLEX CANVAS/PDF
                        isStudyMode ? (
                            <div className="flex-1 relative w-full h-full flex flex-row">
                                {/* PDF SECTION - UPDATED FOR IPAD SCROLLING */}
                                {hasPdf && (viewMode === 'pdf' || isSplitView) && (
                                    <div
                                        className={`flex-1 bg-gray-100 dark:bg-zinc-900 relative border-r border-gray-200 dark:border-zinc-800 overflow-y-auto touch-auto ${isSplitView ? 'w-full lg:w-1/2' : 'w-full'}`}
                                        style={{ WebkitOverflowScrolling: 'touch' }} // iOS smooth scroll fix
                                    >
                                        <div className="absolute top-4 right-4 z-10"><a href={task.pdfUrl} target="_blank" rel="noreferrer" className="bg-white dark:bg-black p-2 rounded-lg shadow-md text-gray-500 hover:text-teal-600 transition-colors block"><ExternalLink size={16} /></a></div>

                                        {/* Added wrapping div and updated iframe props */}
                                        <div className="w-full h-full min-h-0 overflow-auto">
                                            <iframe
                                                src={`${task.pdfUrl}#toolbar=0`}
                                                className="w-full h-full border-none"
                                                title="PDF Preview"
                                                scrolling="yes"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* CANVAS SECTION - UPDATED FOR NEW CANVAS NOTE FEATURES */}
                                {(viewMode === 'notes' || isSplitView || !hasPdf) && (
                                    <div className={`flex-1 flex flex-col bg-white dark:bg-zinc-950 relative overflow-hidden ${isSplitView && hasPdf ? 'w-full lg:w-1/2' : 'w-full'}`}>
                                        <div className="h-12 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between px-4 bg-gray-50/30 dark:bg-zinc-900/30 shrink-0">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2">Page {currentPage + 1}</span>
                                            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-1 shadow-sm">
                                                <button onClick={handlePrevPage} disabled={currentPage === 0} className="p-1 text-gray-500 hover:text-teal-600 disabled:opacity-30"><ChevronLeft size={16} /></button>
                                                <button onClick={handleNextPage} className="p-1 text-gray-500 hover:text-teal-600"><ChevronRight size={16} /></button>
                                            </div>
                                        </div>

                                        <CanvasNote
                                            key={currentPage}
                                            image={notePages[currentPage]}
                                            onSave={handlePageSave}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            // IF PREVIEW MODE (DEFAULT) -> SHOW SIMPLE TEXT DETAILS
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full">
                                {/* ... (Your existing code for details mode is unchanged) ... */}
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => { setDescription(e.target.value); setIsEditing(true); }}
                                            className="w-full min-h-[150px] bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-4 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all resize-none"
                                            placeholder="No additional details."
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</label>
                                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded">{checklist.filter(i => i.isChecked).length}/{checklist.length}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {checklist.map((item, index) => (
                                                <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg group transition-colors">
                                                    <input type="checkbox" checked={item.isChecked} onChange={() => toggleCheckItem(index)} className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" />
                                                    <span className={`text-sm flex-1 ${item.isChecked ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-zinc-300'}`}>{item.title}</span>
                                                    <button onClick={() => deleteCheckItem(index)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()} className="flex-1 bg-gray-50 dark:bg-zinc-900 rounded-lg px-3 py-2 text-xs border border-gray-200 outline-none" placeholder="Add item..." />
                                            <button onClick={addChecklistItem} className="p-2 bg-teal-600 text-white rounded-lg"><Plus size={16} /></button>
                                        </div>
                                    </div>

                                    {hasPdf && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Attachment</label>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-800/30">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-teal-900 flex items-center justify-center text-teal-600"><FileText size={16} /></div>
                                                    <div className="flex flex-col"><span className="text-xs font-bold text-teal-900 dark:text-teal-100">Attached PDF</span><span className="text-[10px] text-teal-600">Switch to Study Mode to view</span></div>
                                                </div>
                                                <button onClick={() => setIsStudyMode(true)} className="px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg shadow-sm">Open Canvas</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewTaskModal;