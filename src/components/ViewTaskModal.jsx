import React, { useState, useEffect, useRef } from 'react';
import {
    X, Save, ExternalLink, Trash2, Plus,
    FileText, Brain, Hash, Layout, PenTool,
    ChevronLeft, ChevronRight, Eraser, Columns, Maximize
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import QuizComponent from './QuizComponent';

const ViewTaskModal = ({ isOpen, onClose, task, onUpdate, onDelete }) => {
    if (!isOpen || !task) return null;

    const [activeTab, setActiveTab] = useState('details');
    const [viewMode, setViewMode] = useState('notes'); // 'notes' | 'pdf'

    // --- NEW: SPLIT SCREEN STATE ---
    const [isSplitView, setIsSplitView] = useState(false);

    // Task Data
    const [title, setTitle] = useState(task.title);
    const [checklist, setChecklist] = useState(task.checklist || []);
    const [newItem, setNewItem] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- PAGINATION & DRAWING STATE ---
    const [notePages, setNotePages] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const [quizQuestions, setQuizQuestions] = useState([]);
    const hasPdf = !!(task.pdfUrl || task.hasAttachment);

    useEffect(() => {
        setTitle(task.title);
        setChecklist(task.checklist || []);
        setIsEditing(false);
        setActiveTab('details');

        // Reset View States
        setViewMode('notes');
        setIsSplitView(false); // Reset split on new task open

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

    // Redraw canvas when page, view mode, or split view changes
    useEffect(() => {
        // We check if the Note View is visible (It is visible if viewMode is 'notes' OR if split view is active)
        const isNoteVisible = viewMode === 'notes' || isSplitView;

        if (isNoteVisible && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            const savedImage = notePages[currentPage];
            if (savedImage) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = savedImage;
            }
        }
    }, [currentPage, viewMode, isSplitView, notePages]);

    // --- SCALED DRAWING LOGIC (Fixes Offset Issue) ---
    const getCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect(); // Visual size (CSS pixels)
        const scaleX = canvas.width / rect.width;    // Ratio of Internal Resolution / Visual Width
        const scaleY = canvas.height / rect.height;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const { x, y } = getCoordinates(e, canvas);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000';
        setIsDrawing(true);
        setIsEditing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const { x, y } = getCoordinates(e, canvas);

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.getContext('2d').closePath();
                saveCurrentPageToState();
            }
        }
    };

    const saveCurrentPageToState = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL();
            const updatedPages = [...notePages];
            updatedPages[currentPage] = dataUrl;
            setNotePages(updatedPages);
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveCurrentPageToState();
            setIsEditing(true);
        }
    };

    // --- PAGINATION HANDLERS ---
    const handleNextPage = () => {
        if (currentPage === notePages.length - 1) {
            setNotePages([...notePages, null]);
        }
        setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // --- CHECKLIST & SAVE ---
    const addChecklistItem = () => {
        if (!newItem.trim()) return;
        setChecklist([...checklist, { title: newItem, isChecked: false }]);
        setNewItem("");
        setIsEditing(true);
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            let finalPages = [...notePages];
            // If notes are currently visible, save the current canvas state one last time
            if ((viewMode === 'notes' || isSplitView) && canvasRef.current) {
                finalPages[currentPage] = canvasRef.current.toDataURL();
            }

            const updates = {
                title,
                checklist,
                notePages: finalPages
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

    const handleDelete = () => onDelete(task.id);

    // --- RENDER HELPERS ---
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

                    {/* Left: Task Info */}
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

                    {/* Middle: VIEW CONTROLS */}
                    {hasPdf && activeTab === 'details' && (
                        <div className="flex items-center gap-3">
                            {/* Split Screen Toggle */}
                            <button
                                onClick={() => setIsSplitView(!isSplitView)}
                                className={`p-2 rounded-xl border transition-all ${isSplitView
                                    ? 'bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-900/20 dark:border-teal-800'
                                    : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600 dark:bg-zinc-900 dark:border-zinc-800'}`}
                                title={isSplitView ? "Switch to Single View" : "Switch to Split View"}
                            >
                                {isSplitView ? <Maximize size={18} /> : <Columns size={18} />}
                            </button>

                            {/* View Switcher (Only visible if NOT in Split View) */}
                            {!isSplitView && (
                                <div className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-xl flex items-center gap-1">
                                    <button
                                        onClick={() => setViewMode('pdf')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'pdf' ? 'bg-white dark:bg-zinc-800 text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <FileText size={14} />
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => setViewMode('notes')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'notes' ? 'bg-white dark:bg-zinc-800 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <PenTool size={14} />
                                        Notes
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Right: Actions */}
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
                        <button onClick={() => setActiveTab('details')} className={`py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === 'details' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>
                            Study & Write
                        </button>
                        <button onClick={() => setActiveTab('quiz')} className={`py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'quiz' ? 'text-pink-600 border-pink-600' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>
                            <Brain size={14} /> AI Quiz
                        </button>
                    </div>
                )}

                {/* --- 3. MAIN CONTENT --- */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950 relative flex flex-col">

                    {activeTab === 'quiz' ? (
                        <div className="h-full overflow-y-auto p-6">
                            <QuizComponent task={task} questions={quizQuestions} onUpdate={onUpdate} />
                        </div>
                    ) : (
                        <div className="flex-1 relative w-full h-full flex flex-row">

                            {/* --- A: PDF VIEW --- */}
                            {/* Render if: PDF exists AND (View is PDF OR Split is ON) */}
                            {hasPdf && (viewMode === 'pdf' || isSplitView) && (
                                <div className={`flex-1 bg-gray-100 dark:bg-zinc-900 relative border-r border-gray-200 dark:border-zinc-800 ${isSplitView ? 'w-1/2' : 'w-full'}`}>
                                    <div className="absolute top-4 right-4 z-10">
                                        <a href={task.pdfUrl} target="_blank" rel="noreferrer" className="bg-white dark:bg-black p-2 rounded-lg shadow-md text-gray-500 hover:text-teal-600 transition-colors block" title="Open External">
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                    <iframe src={`${task.pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                                </div>
                            )}

                            {/* --- B: NOTES VIEW (CANVAS) --- */}
                            {/* Render if: (View is Notes OR Split is ON) OR No PDF exists */}
                            {(viewMode === 'notes' || isSplitView || !hasPdf) && (
                                <div className={`flex-1 flex flex-col bg-white dark:bg-zinc-950 relative ${isSplitView && hasPdf ? 'w-1/2' : 'w-full'}`}>

                                    {/* Pagination Toolbar */}
                                    <div className="h-12 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between px-4 bg-gray-50/30 dark:bg-zinc-900/30 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <button onClick={clearCanvas} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Clear Page">
                                                <Eraser size={14} />
                                            </button>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2 hidden md:inline">
                                                Canvas
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-1 shadow-sm">
                                            <button onClick={handlePrevPage} disabled={currentPage === 0} className="p-1 text-gray-500 hover:text-teal-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className="text-xs font-mono font-bold w-12 text-center text-gray-700 dark:text-zinc-300">
                                                {currentPage + 1}/{notePages.length}
                                            </span>
                                            <button onClick={handleNextPage} className="p-1 text-gray-500 hover:text-teal-600 transition-colors">
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* The Canvas Area */}
                                    <div className="flex-1 relative bg-white dark:bg-zinc-950 overflow-hidden cursor-crosshair">
                                        <canvas
                                            ref={canvasRef}
                                            width={1600}
                                            height={1000}
                                            className="w-full h-full touch-none"
                                            style={{ display: 'block' }}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />

                                        <div className="absolute inset-0 pointer-events-none opacity-5"
                                            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- 4. CHECKLIST FOOTER --- */}
                <div className="border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shrink-0 z-20">
                    <div className="flex items-center gap-2 max-w-4xl mx-auto">
                        <div className="flex gap-2 flex-1">
                            <input
                                type="text"
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                className="w-full bg-gray-50 dark:bg-zinc-900 rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-zinc-800 focus:border-teal-500 outline-none"
                                placeholder="Add a quick todo item..."
                            />
                            <button onClick={addChecklistItem} className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-3">
                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded">
                                {checklist.filter(i => i.isChecked).length}/{checklist.length}
                            </span>
                            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ViewTaskModal;