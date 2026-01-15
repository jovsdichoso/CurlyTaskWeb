import React, { useState, useEffect, useRef } from 'react';
import {
    CheckCircle, AlertCircle, RefreshCw, ChevronRight,
    Trophy, Type, Mic, Volume2, VolumeX, Loader2, Check
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const QuizComponent = ({ task, questions, onUpdate }) => {
    // --- Existing State ---
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState(task.quizAnswers || {});
    const [isSubmitted, setIsSubmitted] = useState(task.quizCompleted || false);
    const [score, setScore] = useState(task.quizScore || null);
    const [loading, setLoading] = useState(false);

    // --- Voice State ---
    const [voiceMode, setVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // UI Feedback States
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackType, setFeedbackType] = useState("neutral"); // 'neutral', 'success', 'error'
    const [autoAdvancing, setAutoAdvancing] = useState(false);

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;

    // --- VOICE LOGIC ---

    useEffect(() => {
        return () => stopAudio();
    }, []);

    // Handle Question Change
    useEffect(() => {
        if (voiceMode && !isSubmitted) {
            setFeedbackText("");
            setFeedbackType("neutral");
            setAutoAdvancing(false);

            const timer = setTimeout(() => {
                speakQuestion();
            }, 600); // Slight delay for smoother transition
            return () => clearTimeout(timer);
        }
    }, [currentQuestionIndex, voiceMode, isSubmitted]);

    const stopAudio = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const speakQuestion = () => {
        if (!currentQuestion) return;
        stopAudio();

        let textToRead = currentQuestion.question;

        // Read options naturally
        if (currentQuestion.type !== 'identification') {
            textToRead += ". ";
            currentQuestion.options.forEach((opt, idx) => {
                const letter = ['A', 'B', 'C', 'D'][idx];
                // Clean text for reading (remove heavy punctuation)
                const cleanOpt = opt.replace(/[:.]/g, "");
                textToRead += ` ${letter}: ${cleanOpt}. `;
            });
            textToRead += " Answer?";
        } else {
            textToRead += ". Answer?";
        }

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 1.1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            startListening();
        };

        synthRef.current.speak(utterance);
    };

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setFeedbackText("Listening...");
            setFeedbackType("neutral");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            handleVoiceCommand(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleVoiceCommand = (rawText) => {
        // Remove punctuation for easier matching
        const text = rawText.replace(/[.,!?]/g, "").trim();

        // 1. Navigation Commands
        if (text.includes("next") || text.includes("skip")) {
            setFeedbackText("Skipping...");
            setFeedbackType("success");
            setTimeout(handleNext, 500);
            return;
        }
        if (text.includes("submit") || text.includes("finish")) {
            handleSubmit();
            return;
        }

        // 2. Identification Question
        if (currentQuestion.type === 'identification') {
            handleTextChange(rawText); // Use raw text to keep punctuation if needed
            setFeedbackText(`Recorded: "${rawText}"`);
            setFeedbackType("success");
            triggerAutoAdvance();
            return;
        }

        // 3. Multiple Choice Matching Logic
        let matchIndex = -1;
        const options = currentQuestion.options || [];

        // STRATEGY A: Check for "First", "Second", "Last"
        const ordinalMap = { 'first': 0, 'second': 1, 'third': 2, 'fourth': 3, 'last': options.length - 1, '1st': 0, '2nd': 1, '3rd': 2 };
        const words = text.split(" ");
        const foundOrdinal = words.find(w => ordinalMap[w] !== undefined);
        if (foundOrdinal !== undefined) {
            matchIndex = ordinalMap[foundOrdinal];
        }

        // STRATEGY B: Check for Letter (A, B, C, D)
        // We check the LAST word or if the text IS just a letter
        if (matchIndex === -1) {
            const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
            const lastWord = words[words.length - 1];
            if (letterMap[lastWord] !== undefined) {
                matchIndex = letterMap[lastWord];
            }
        }

        // STRATEGY C: Content Matching (Fuzzy Search)
        // Does the spoken text contain the option? OR Does the option contain the spoken text?
        if (matchIndex === -1) {
            matchIndex = options.findIndex(opt => {
                const cleanOpt = opt.toLowerCase().replace(/[.,!?]/g, "").trim();
                // Check if user said the exact option
                if (text.includes(cleanOpt)) return true;
                // Check if option contains what user said (for long options)
                // e.g. Option="Red ball", User="Ball" -> Match
                if (cleanOpt.includes(text) && text.length > 3) return true;
                return false;
            });
        }

        // --- RESULT ---
        if (matchIndex !== -1) {
            // SUCCESS
            handleOptionSelect(matchIndex);

            const letter = ['A', 'B', 'C', 'D'][matchIndex];
            setFeedbackText(`Matched: Option ${letter}`);
            setFeedbackType("success");

            triggerAutoAdvance();
        } else {
            // FAILURE
            setFeedbackText(`"${rawText}" (?)\nTry saying "Option A"`);
            setFeedbackType("error");
            // Optional: Speak "Try again"
            // const utt = new SpeechSynthesisUtterance("I didn't catch that.");
            // synthRef.current.speak(utt);
        }
    };

    const triggerAutoAdvance = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setAutoAdvancing(true);
            const utterance = new SpeechSynthesisUtterance("Got it.");
            synthRef.current.speak(utterance);
            setTimeout(() => {
                handleNext();
            }, 1200);
        } else {
            const utterance = new SpeechSynthesisUtterance("Got it. Ready to submit?");
            synthRef.current.speak(utterance);
        }
    };

    const toggleVoiceMode = () => {
        const newMode = !voiceMode;
        setVoiceMode(newMode);
        if (!newMode) stopAudio();
        else speakQuestion();
    };

    // --- Standard Handlers ---
    const handleOptionSelect = (idx) => {
        if (isSubmitted) return;
        setSelectedOptions(prev => ({ ...prev, [currentQuestionIndex + 1]: idx }));
    };

    const handleTextChange = (text) => {
        if (isSubmitted) return;
        setSelectedOptions(prev => ({ ...prev, [currentQuestionIndex + 1]: text }));
    };

    const handleNext = () => {
        stopAudio();
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handleBack = () => {
        stopAudio();
        setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
    }

    const calculateScore = () => {
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const qNum = idx + 1;
            const userAnswer = selectedOptions[qNum];
            if (q.type === 'identification') {
                if (userAnswer && q.correct_answer && userAnswer.toString().toLowerCase().trim() === q.correct_answer.toString().toLowerCase().trim()) correctCount++;
            } else if (userAnswer !== undefined && typeof userAnswer === 'number') {
                if (q.options[userAnswer]?.trim() === q.correct_answer?.trim()) correctCount++;
            }
        });
        return { correct: correctCount, total: totalQuestions };
    };

    const handleSubmit = async () => {
        stopAudio();
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
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleRetake = async () => {
        if (!window.confirm("Reset quiz?")) return;
        try {
            await updateDoc(doc(db, "tasks", task.id), { quizAnswers: {}, quizScore: null, quizCompleted: false });
            onUpdate({ ...task, quizAnswers: {}, quizScore: null, quizCompleted: false });
            setIsSubmitted(false); setScore(null); setSelectedOptions({}); setCurrentQuestionIndex(0); stopAudio();
        } catch (e) { console.error(e); }
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'identification': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
            case 'situational': return 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
            default: return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative">

            {/* --- VOICE OVERLAY --- */}
            {voiceMode && !isSubmitted && (
                <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-2">

                    {/* 1. Status Badge */}
                    <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border shadow-sm transition-all flex items-center gap-2
                        ${autoAdvancing ? 'bg-emerald-100/90 border-emerald-200 text-emerald-700' :
                            isListening ? 'bg-red-100/90 border-red-200 text-red-600' :
                                isSpeaking ? 'bg-blue-100/90 border-blue-200 text-blue-600' :
                                    'bg-gray-100/90 border-gray-200 text-gray-500'}`}>

                        {autoAdvancing ? <CheckCircle size={14} className="animate-bounce" /> :
                            isListening ? <Mic size={14} className="animate-pulse" /> :
                                isSpeaking ? <Volume2 size={14} className="animate-pulse" /> :
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />}

                        <span className="text-[10px] font-bold uppercase tracking-wide">
                            {autoAdvancing ? "Next..." : isListening ? "Listening" : isSpeaking ? "Reading" : "Waiting"}
                        </span>
                    </div>

                    {/* 2. Feedback Text Bubble (Shows what it heard/matched) */}
                    {feedbackText && (
                        <div className={`px-3 py-2 rounded-lg max-w-[160px] text-xs font-medium shadow-sm animate-in fade-in slide-in-from-top-2 border
                            ${feedbackType === 'success' ? 'bg-emerald-500 text-white border-emerald-600' :
                                feedbackType === 'error' ? 'bg-rose-500 text-white border-rose-600' :
                                    'bg-zinc-800 text-white border-zinc-700'}`}>
                            {feedbackText}
                        </div>
                    )}

                    {/* 3. Manual Mic Trigger */}
                    {!isListening && !isSpeaking && !autoAdvancing && (
                        <button
                            onClick={startListening}
                            className="bg-teal-600 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
                        >
                            <Mic size={20} />
                        </button>
                    )}
                </div>
            )}

            {/* --- RESULTS VIEW --- */}
            {isSubmitted && score ? (
                <div className="flex flex-col items-center animate-in fade-in duration-300 py-4 overflow-y-auto">
                    <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-3">
                        <Trophy size={32} className="text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round((score.correct / score.total) * 100)}% Score</h2>
                    <button onClick={handleRetake} className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-sm font-bold">
                        <RefreshCw size={16} /> Retake Quiz
                    </button>
                </div>
            ) : (
                /* --- ACTIVE QUIZ VIEW --- */
                <div className="flex flex-col h-full">
                    <div className="mb-6 flex items-end justify-between pr-14">
                        <div className="flex-1">
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                <span>Question {currentQuestionIndex + 1}/{totalQuestions}</span>
                                <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500 transition-all" style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }} />
                            </div>
                        </div>
                        <button onClick={toggleVoiceMode} className={`ml-3 p-2 rounded-xl border transition-all ${voiceMode ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-white border-gray-200 text-gray-400'}`}>
                            {voiceMode ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                    </div>

                    <div className="mb-4">
                        <span className={`inline-block mb-2 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getTypeBadgeClass(currentQuestion?.type)}`}>
                            {currentQuestion?.type}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">
                            {currentQuestion?.question}
                        </h3>
                    </div>

                    <div className="flex-1 mb-4 overflow-y-auto">
                        {currentQuestion?.type === 'identification' ? (
                            <div className="space-y-4 pt-2">
                                <input
                                    type="text"
                                    value={selectedOptions[currentQuestionIndex + 1] || ""}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    className="w-full p-3 rounded-xl border bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-teal-500/20"
                                    placeholder={voiceMode ? "Say your answer..." : "Type answer..."}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {currentQuestion?.options.map((option, idx) => {
                                    const isSelected = selectedOptions[currentQuestionIndex + 1] === idx;
                                    const letter = ['A', 'B', 'C', 'D'][idx];
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(idx)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between
                                                ${isSelected ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-800' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold border ${isSelected ? 'bg-teal-500 text-white border-teal-500' : 'bg-gray-100 text-gray-500'}`}>{letter}</span>
                                                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{option}</span>
                                            </div>
                                            {isSelected && <CheckCircle size={16} className="text-teal-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        <button onClick={handleBack} disabled={currentQuestionIndex === 0} className="text-gray-500 font-bold text-sm disabled:opacity-30">Back</button>
                        {currentQuestionIndex < totalQuestions - 1 ? (
                            <button onClick={handleNext} className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">Next <ChevronRight size={14} /></button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading} className="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">{loading ? <Loader2 className="animate-spin" /> : "Finish"}</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizComponent;