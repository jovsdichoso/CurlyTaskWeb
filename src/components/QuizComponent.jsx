import React, { useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, ChevronRight, CheckSquare, Trophy, Type } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const QuizComponent = ({ task, questions, onUpdate }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState(task.quizAnswers || {});
    const [isSubmitted, setIsSubmitted] = useState(task.quizCompleted || false);
    const [score, setScore] = useState(task.quizScore || null);
    const [loading, setLoading] = useState(false);

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;

    // --- LOGIC ---
    // Handle Multiple Choice / Situational Click
    const handleOptionSelect = (optionIndex) => {
        if (isSubmitted) return;
        setSelectedOptions(prev => ({
            ...prev,
            [currentQuestionIndex + 1]: optionIndex // Stores index (0, 1, 2, 3)
        }));
    };

    // Handle Text Input (Identification)
    const handleTextChange = (text) => {
        if (isSubmitted) return;
        setSelectedOptions(prev => ({
            ...prev,
            [currentQuestionIndex + 1]: text // Stores string ("Mitochondria")
        }));
    };

    const calculateScore = () => {
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const qNum = idx + 1;
            const userAnswer = selectedOptions[qNum];

            // Handle Identification (String comparison)
            if (q.type === 'identification') {
                if (userAnswer &&
                    userAnswer.toString().toLowerCase().trim() === q.correct_answer.toString().toLowerCase().trim()) {
                    correctCount++;
                }
            }
            // Handle Multiple Choice / Situational (Index comparison)
            else if (userAnswer !== undefined && typeof userAnswer === 'number') {
                const selectedText = q.options[userAnswer];
                if (selectedText?.trim() === q.correct_answer?.trim()) {
                    correctCount++;
                }
            }
        });
        return { correct: correctCount, total: totalQuestions };
    };

    const handleSubmit = async () => {
        const finalScore = calculateScore();
        setScore(finalScore);
        setIsSubmitted(true);
        setLoading(true);

        try {
            await updateDoc(doc(db, "tasks", task.id), {
                quizAnswers: selectedOptions,
                quizScore: finalScore,
                quizCompleted: true
            });
            onUpdate({ ...task, quizAnswers: selectedOptions, quizScore: finalScore, quizCompleted: true });
        } catch (error) {
            console.error("Error saving quiz:", error);
            alert("Failed to save results.");
        } finally {
            setLoading(false);
        }
    };

    const handleRetake = async () => {
        if (!window.confirm("Reset your progress?")) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, "tasks", task.id), {
                quizAnswers: {},
                quizScore: null,
                quizCompleted: false
            });
            onUpdate({ ...task, quizAnswers: {}, quizScore: null, quizCompleted: false });
            setIsSubmitted(false);
            setScore(null);
            setSelectedOptions({});
            setCurrentQuestionIndex(0);
        } catch (error) {
            console.error("Error resetting quiz:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get badge color for question type
    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'identification': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'situational': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-blue-50 text-blue-600 border-blue-100'; // multiple_choice
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'identification': return 'Identification';
            case 'situational': return 'Situational';
            default: return 'Multiple Choice';
        }
    };

    // --- RENDER ---
    return (
        <div className="w-full h-full flex flex-col">

            {/* 1. RESULTS VIEW */}
            {isSubmitted && score ? (
                <div className="flex flex-col items-center animate-in fade-in duration-300 py-4">
                    <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-3">
                        <Trophy size={32} className="text-yellow-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {Math.round((score.correct / score.total) * 100)}% Score
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
                        You got {score.correct} out of {score.total} correct
                    </p>

                    <button
                        onClick={handleRetake}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 rounded-xl text-sm font-bold transition-colors mb-8"
                    >
                        <RefreshCw size={16} /> Retake Quiz
                    </button>

                    {/* Review Answers List */}
                    <div className="w-full space-y-3">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Review Answers</h3>
                        {questions.map((q, idx) => {
                            const userAnswer = selectedOptions[idx + 1];
                            const correctText = q.correct_answer;

                            let isCorrect = false;
                            let userText = "Skipped";

                            if (q.type === 'identification') {
                                userText = userAnswer || "Skipped";
                                isCorrect = userText.toString().toLowerCase().trim() === correctText.toString().toLowerCase().trim();
                            } else {
                                userText = q.options[userAnswer] || "Skipped";
                                isCorrect = userText === correctText;
                            }

                            return (
                                <div key={idx} className={`p-3 rounded-xl border text-sm ${isCorrect ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/10'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-gray-800 dark:text-gray-200 flex-1 mr-2"><span className="text-gray-400 mr-1">{idx + 1}.</span> {q.question}</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getTypeBadgeClass(q.type)}`}>
                                            {q.type === 'identification' ? 'ID' : q.type === 'situational' ? 'SIT' : 'MC'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1 mt-2">
                                        <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold text-xs uppercase w-12">You:</span>
                                            <span className="flex-1 truncate">{userText}</span>
                                            {isCorrect ? <CheckCircle size={14} className="text-emerald-500 shrink-0" /> : <AlertCircle size={14} className="text-rose-500 shrink-0" />}
                                        </p>
                                        {!isCorrect && (
                                            <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                                <span className="font-semibold text-xs uppercase w-12 text-gray-500">Answer:</span> {correctText}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* 2. ACTIVE QUIZ VIEW */
                <div className="flex flex-col h-full">
                    {/* Progress Bar */}
                    <div className="mb-6">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                            <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-teal-500 transition-all duration-300 ease-out"
                                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Question Header */}
                    <div className="mb-6">
                        <span className={`inline-block mb-2 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getTypeBadgeClass(currentQuestion?.type)}`}>
                            {getTypeLabel(currentQuestion?.type)}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
                            {currentQuestion?.question || "Loading Question..."}
                        </h3>
                    </div>

                    {/* Options Area (Dynamic based on Type) */}
                    <div className="flex-1 mb-6 overflow-y-auto">
                        {currentQuestion?.type === 'identification' ? (
                            // IDENTIFICATION INPUT
                            <div className="space-y-4 pt-2">
                                <div className="relative">
                                    <Type className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={selectedOptions[currentQuestionIndex + 1] || ""}
                                        onChange={(e) => handleTextChange(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-gray-900 dark:text-white"
                                        placeholder="Type your answer here..."
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-gray-400 ml-1">Tip: Answers are not case-sensitive.</p>
                            </div>
                        ) : (
                            // MULTIPLE CHOICE & SITUATIONAL BUTTONS
                            <div className="space-y-2.5">
                                {currentQuestion?.options.map((option, idx) => {
                                    const isSelected = selectedOptions[currentQuestionIndex + 1] === idx;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(idx)}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group
                                                ${isSelected
                                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200 shadow-sm'
                                                    : 'border-gray-200 dark:border-zinc-700 hover:border-teal-300 hover:bg-gray-50 dark:hover:bg-zinc-900'
                                                }`}
                                        >
                                            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{option}</span>
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                                                ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300 dark:border-gray-500'}`}>
                                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800 mt-auto">
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="text-gray-500 dark:text-zinc-500 font-bold text-sm hover:text-gray-800 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Back
                        </button>

                        {currentQuestionIndex < totalQuestions - 1 ? (
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                                className="bg-gray-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md shadow-teal-600/20 transition-all"
                            >
                                {loading ? "Submitting..." : "Finish Quiz"}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizComponent;