import React, { useState } from 'react'; // 1. Ensure useState is imported
import {
    Calendar, Trash2, Paperclip,
    Briefcase, User, GraduationCap, Layout,
    FileText, Star, Zap, Coffee, Brain, Hash,
    Palette
} from 'lucide-react';

const TaskCard = ({ task, onDelete, onClick, onColorChange }) => {
    // 2. Add state for the color menu
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

    const colorVariants = {
        default: "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800",
        blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
        green: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
        purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900",
        orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
        pink: "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900",
        yellow: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
    };

    const dotColors = {
        default: "bg-gray-200",
        blue: "bg-blue-400",
        green: "bg-emerald-400",
        purple: "bg-purple-400",
        orange: "bg-orange-400",
        pink: "bg-pink-400",
        yellow: "bg-yellow-400",
    };

    const cardTheme = colorVariants[task.color] || colorVariants.default;

    const getTaskIcon = (emojiName, category) => {
        const props = { size: 22, className: "text-teal-600 dark:text-teal-400" };
        if (emojiName === 'brain') return <Brain {...props} className="text-purple-600 dark:text-purple-400" />;
        if (emojiName === 'document-text') return <FileText {...props} />;
        if (emojiName === 'star') return <Star {...props} />;
        if (emojiName === 'zap') return <Zap {...props} />;
        if (emojiName === 'coffee') return <Coffee {...props} />;

        switch (category) {
            case 'Work': return <Briefcase {...props} className="text-blue-600 dark:text-blue-400" />;
            case 'Personal': return <User {...props} className="text-purple-600 dark:text-purple-400" />;
            case 'Academic': return <GraduationCap {...props} className="text-orange-600 dark:text-orange-400" />;
            default: return <Layout {...props} className="text-gray-600 dark:text-gray-400" />;
        }
    };

    const getPriorityStyle = (p) => {
        switch (p) {
            case 'high': return 'bg-rose-100/50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-900/50';
            case 'medium': return 'bg-amber-100/50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-900/50';
            case 'low': return 'bg-blue-100/50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-900/50';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const totalItems = task.checklist ? task.checklist.length : 0;
    const completedItems = task.checklist ? task.checklist.filter(i => i.isChecked).length : 0;
    const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    return (
        <div
            onClick={onClick}
            // Added z-0 to ensure stacking context allows the popup to show
            className={`group relative rounded-[20px] p-4 border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer z-0 ${cardTheme}`}
        >
            {/* Header: Icon, Color Picker, & Delete */}
            <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-white/60 dark:bg-black/20 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/10">
                    {getTaskIcon(task.emoji, task.category)}
                </div>

                <div className="flex gap-2 items-center">

                    {/* --- FIXED: Color Picker UI (Click instead of Hover) --- */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Stop card click
                                setIsColorMenuOpen(!isColorMenuOpen); // Toggle Menu
                            }}
                            className={`p-1.5 rounded-lg transition-all ${isColorMenuOpen ? 'opacity-100 text-teal-600 bg-white dark:bg-zinc-800' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-teal-600 hover:bg-white dark:hover:bg-zinc-800'}`}
                        >
                            <Palette size={14} />
                        </button>

                        {/* The Menu */}
                        {isColorMenuOpen && (
                            <>
                                {/* Invisible Backdrop to close menu when clicking outside */}
                                <div
                                    className="fixed inset-0 z-40 cursor-default"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsColorMenuOpen(false);
                                    }}
                                />

                                {/* Dropdown Content */}
                                <div className="absolute right-0 top-8 z-50 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-2 rounded-xl shadow-2xl gap-1.5 min-w-[140px] flex flex-wrap justify-end animate-in fade-in zoom-in-95 duration-200">
                                    {Object.keys(colorVariants).map((colorKey) => (
                                        <button
                                            key={colorKey}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onColorChange) onColorChange(task.id, colorKey);
                                                setIsColorMenuOpen(false); // Close after picking
                                            }}
                                            className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 active:scale-95 ${dotColors[colorKey]} ${task.color === colorKey ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-zinc-900' : ''}`}
                                            title={colorKey}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    {/* --- END Color Picker --- */}

                    <div className="px-1.5 py-0.5 bg-white/50 dark:bg-black/20 rounded-md flex items-center gap-1 text-[9px] font-mono text-gray-500 border border-black/5 dark:border-white/10">
                        <Hash size={8} />
                        {task.id.substring(0, 6).toUpperCase()}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="mb-3">
                <h3 className={`text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 ${task.completed && 'line-through text-gray-400'}`}>
                    {task.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">
                    {task.description || "No additional details provided."}
                </p>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                </span>

                {task.quizDataJson && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-purple-100/50 text-purple-700 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                        <Brain size={9} />
                        Quiz
                    </span>
                )}

                {(task.pdfUrl || task.hasAttachment) && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-teal-100/50 text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800">
                        <Paperclip size={9} />
                        File
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            {totalItems > 0 && (
                <div className="mb-3 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-black/5 dark:border-white/5">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Progress</span>
                        <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">{progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-500">
                    <Calendar size={12} />
                    <span className="text-[10px] font-semibold">{task.dueDate || "No Date"}</span>
                </div>

                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-bold text-indigo-600 dark:text-indigo-400">
                    Me
                </div>
            </div>
        </div>
    );
};

export default TaskCard;