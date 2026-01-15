import React, { useState, useEffect, useRef } from 'react';
import {
    X, Calendar, CheckSquare, Trash2, Save, ExternalLink,
    Plus, FileText, Brain, Hash, Layout, PenTool, Keyboard, Eraser
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
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

    // Drawing State
    const [inputMode, setInputMode] = useState('keyboard'); // 'keyboard' | 'pen'
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const [quizQuestions, setQuizQuestions] = useState([]);
    const hasPdf = !!(task.pdfUrl || task.hasAttachment);

    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description);
        setChecklist(task.checklist || []);
        setIsEditing(false);
        setActiveTab('details');

        // Load Drawing if exists
        if (task.notesSketch && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = task.notesSketch;
        }

        if (task.quizDataJson) {
            try {
                const parsed = typeof task.quizDataJson === "string" ? JSON.parse(task.quizDataJson) : task.quizDataJson;
                setQuizQuestions(Array.isArray(parsed) ? parsed : parsed.questions || []);
            } catch (e) {
                setQuizQuestions([]);
            }
        }
    }, [task, inputMode]);

    // --- DRAWING LOGIC ---
    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        // Handle Touch or Mouse
        // Note: We use e.touches for touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000';
        setIsDrawing(true);
        setIsEditing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.getContext('2d').closePath();
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEditing(true);
        }
    }
    // ---------------------

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

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            let updates = { title, description, checklist };

            // Save Sketch if Canvas exists
            if (canvasRef.current) {
                updates.notesSketch = canvasRef.current.toDataURL();
            }

            await updateDoc(doc(db, "tasks", task.id), updates);
            onUpdate({ ...task, ...updates });
            setIsEditing(false);
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

    const renderIcon = () => {
        if (task.emoji === 'brain') return <Brain size={32} className="text-pink-500" />;
        else if (task.emoji === 'document-text') return <FileText size={32} className="text-teal-600" />;
        else return <Layout size={32} className="text-gray-500" />;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-zinc-950 w-full ${hasPdf ? 'max-w-[95vw] h-[90vh]' : 'max-w-3xl max-h-[90vh]'} rounded-[24px] shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col overflow-hidden transition-all duration-300`}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
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

                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <button
                                onClick={handleSaveChanges}
                                disabled={loading}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5 transition-all"
                            >
                                {loading ? "Saving..." : <><Save size={14} /> Save Changes</>}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-950 relative">
                    {activeTab === 'quiz' ? (
                        <div className="h-full overflow-y-auto p-6">
                            <QuizComponent task={task} questions={quizQuestions} onUpdate={onUpdate} />
                        </div>
                    ) : (
                        <div className={`h-full ${hasPdf ? 'flex flex-col md:flex-row' : 'flex flex-col'}`}>

                            {/* LEFT PANEL: PDF Viewer */}
                            {hasPdf && (
                                <div className="flex-1 bg-gray-100 dark:bg-zinc-900 h-full relative border-r border-gray-200 dark:border-zinc-800 order-last md:order-first">
                                    <div className="absolute top-2 right-2 z-10">
                                        <a href={task.pdfUrl} target="_blank" rel="noreferrer" className="bg-white dark:bg-black p-2 rounded-lg shadow-md text-gray-500 hover:text-teal-600 transition-colors block" title="Open in New Tab">
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                    <iframe
                                        src={`${task.pdfUrl}#toolbar=0`}
                                        className="w-full h-full"
                                        title="PDF Preview"
                                    />
                                </div>
                            )}

                            {/* RIGHT PANEL: Notes & Tools */}
                            <div className={`flex-1 flex flex-col p-6 ${hasPdf ? 'md:w-1/2' : 'w-full max-w-2xl mx-auto'}`}>

                                {/* --- INPUT MODE TOGGLE & HEADER --- */}
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText size={12} /> Class Notes
                                    </label>

                                    <div className="bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg flex items-center">
                                        <button
                                            onClick={() => setInputMode('keyboard')}
                                            className={`p-1.5 rounded-md transition-all ${inputMode === 'keyboard' ? 'bg-white dark:bg-zinc-800 shadow text-teal-600' : 'text-gray-400'}`}
                                            title="Keyboard Mode"
                                        >
                                            <Keyboard size={14} />
                                        </button>
                                        <button
                                            onClick={() => setInputMode('pen')}
                                            className={`p-1.5 rounded-md transition-all ${inputMode === 'pen' ? 'bg-white dark:bg-zinc-800 shadow text-purple-600' : 'text-gray-400'}`}
                                            title="Pen Mode"
                                        >
                                            <PenTool size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* --- SCROLLABLE NOTE AREA (Fixed Height) --- */}
                                {/* This div handles the scrolling for both input methods */}
                                <div className={`relative w-full rounded-xl border transition-all overflow-y-auto flex-1 mb-6 
                                    ${inputMode === 'pen' ? 'border-purple-200 dark:border-purple-900/50' : 'border-yellow-100 dark:border-yellow-900/20'}
                                    bg-yellow-50 dark:bg-yellow-900/10`}
                                    // Set a maxHeight to force scrolling when content is long
                                    style={{ maxHeight: 'calc(100vh - 300px)', minHeight: '400px' }}
                                >

                                    {/* OPTION 1: Keyboard Mode */}
                                    {inputMode === 'keyboard' && (
                                        <textarea
                                            value={description}
                                            onChange={(e) => { setDescription(e.target.value); setIsEditing(true); }}
                                            className="w-full h-full min-h-[500px] bg-transparent p-4 text-sm text-gray-800 dark:text-zinc-200 leading-relaxed outline-none resize-none"
                                            placeholder="Type your notes here..."
                                            style={{ fontFamily: 'monospace' }}
                                        />
                                    )}

                                    {/* OPTION 2: Pen Mode (Tall Canvas) */}
                                    <div className={`${inputMode === 'pen' ? 'block' : 'hidden'} relative`}>
                                        <canvas
                                            ref={canvasRef}
                                            width={500}
                                            height={2000} // TALL CANVAS FOR SCROLLING
                                            className="w-full cursor-crosshair touch-none" // touch-none prevents page scroll when drawing
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                        />

                                        {/* Floating Clear Button inside Scroll Area */}
                                        <button
                                            onClick={clearCanvas}
                                            className="sticky top-2 left-[90%] p-1.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur rounded-lg text-gray-500 hover:text-red-500 border border-gray-200 dark:border-zinc-700 shadow-sm z-10"
                                            title="Clear Canvas"
                                        >
                                            <Eraser size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Checklist Section (Bottom, Fixed) */}
                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-zinc-800 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</label>
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
                                            className="flex-1 bg-gray-50 dark:bg-zinc-900 rounded-lg px-3 py-2 text-xs border border-gray-200 dark:border-zinc-800 focus:border-teal-500 outline-none"
                                            placeholder="Add todo..."
                                        />
                                        <button onClick={addChecklistItem} className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                                        {checklist.map((item, index) => (
                                            <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-lg group transition-colors">
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 flex justify-between items-center shrink-0">
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors font-bold text-[10px] uppercase tracking-wide"
                    >
                        <Trash2 size={14} />
                        Delete Task
                    </button>
                    <div className="text-[10px] text-gray-400">
                        {isEditing ? "Unsaved changes" : "All changes saved"}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ViewTaskModal;