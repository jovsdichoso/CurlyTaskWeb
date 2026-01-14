import React from 'react';
import {
    Calendar, Trash2, Paperclip,
    Briefcase, User, GraduationCap, Layout,
    FileText, Star, Zap, Coffee, Brain, Hash
} from 'lucide-react';

const TaskCard = ({ task, onDelete, onClick }) => {

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
            case 'high': return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-900/50';
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-900/50';
            case 'low': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-900/50';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const totalItems = task.checklist ? task.checklist.length : 0;
    const completedItems = task.checklist ? task.checklist.filter(i => i.isChecked).length : 0;
    const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    return (
        <div
            onClick={onClick}
            className="group relative bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        >
            {/* Header: Icon & Delete */}
            <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-gray-100 dark:border-zinc-700">
                    {getTaskIcon(task.emoji, task.category)}
                </div>

                <div className="flex gap-2">
                    <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded-md flex items-center gap-1 text-[9px] font-mono text-gray-500 border border-gray-200 dark:border-zinc-700">
                        <Hash size={8} />
                        {task.id.substring(0, 6).toUpperCase()}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
                <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed h-8">
                    {task.description || "No additional details provided."}
                </p>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-1.5 mb-4">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                </span>

                {task.quizDataJson && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900">
                        <Brain size={9} />
                        Quiz
                    </span>
                )}

                {(task.pdfUrl || task.hasAttachment) && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-900">
                        <Paperclip size={9} />
                        File
                    </span>
                )}
            </div>

            {/* Progress Bar (Conditional) */}
            {totalItems > 0 && (
                <div className="mb-3 bg-gray-50 dark:bg-zinc-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Progress</span>
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">{progress}%</span>
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
            <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
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