import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';

const CalendarView = ({ tasks, onTaskClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper: Get days in month
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    // Helper: Get start day of week (0 = Sunday)
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Navigation
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Get tasks for a specific day
    const getTasksForDay = (day) => {
        return tasks.filter(task => {
            if (!task.dueTimestamp) return false;
            // Handle Firestore Timestamp or JS Date object
            const taskDate = task.dueTimestamp.toDate ? task.dueTimestamp.toDate() : new Date(task.dueTimestamp);
            return (
                taskDate.getDate() === day &&
                taskDate.getMonth() === month &&
                taskDate.getFullYear() === year
            );
        });
    };

    const renderDays = () => {
        const days = [];
        // Empty cells for days before start of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50/30 dark:bg-zinc-900/30 border border-gray-100 dark:border-zinc-800" />);
        }

        // Actual Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayTasks = getTasksForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

            days.push(
                <div key={day} className={`h-32 border border-gray-100 dark:border-zinc-800 p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900 ${isToday ? 'bg-teal-50/50 dark:bg-teal-900/10' : 'bg-white dark:bg-zinc-950'}`}>
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-teal-600 text-white' : 'text-gray-500 dark:text-zinc-400'}`}>
                        {day}
                    </span>

                    {/* Task Dots/Bars */}
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                        {dayTasks.map(task => (
                            <button
                                key={task.id}
                                onClick={() => onTaskClick(task)}
                                className={`w-full text-left px-2 py-1 rounded text-[10px] font-bold truncate transition-opacity hover:opacity-80
                                    ${task.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                        task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}
                                    ${task.completed ? 'opacity-50 line-through' : ''}
                                `}
                            >
                                {task.title}
                            </button>
                        ))}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950 rounded-[24px] border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {monthNames[month]} <span className="text-teal-600">{year}</span>
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-600 dark:text-zinc-400 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-600 dark:text-zinc-400 transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
                {renderDays()}
            </div>
        </div>
    );
};

export default CalendarView;