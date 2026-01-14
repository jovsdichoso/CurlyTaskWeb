import React, { useState } from 'react';
import {
    X, Briefcase, User, GraduationCap, Calendar,
    UploadCloud, FileText, Trash2, Loader2,
    CheckSquare, Flag, Sparkles, AlertCircle
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/du1dwcrhb/raw/upload";
const CLOUDINARY_PRESET = "tasks_pdfs";

const AddTaskModal = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [category, setCategory] = useState('Work');
    const [dueDate, setDueDate] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // AI Toggle State
    const [useAI, setUseAI] = useState(false);

    // Loading States
    const [isUploading, setIsUploading] = useState(false);
    const [statusText, setStatusText] = useState("");

    if (!isOpen) return null;

    const categories = [
        { id: 'Work', icon: <Briefcase size={16} />, color: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900' },
        { id: 'Personal', icon: <User size={16} />, color: 'border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900' },
        { id: 'Academic', icon: <GraduationCap size={16} />, color: 'border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900' },
    ];

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            // Automatically enable AI if a file is uploaded (optional UX)
            setUseAI(true);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setUseAI(false); // Disable AI if file is removed
    };

    const getGeminiKey = async () => {
        try {
            const docRef = doc(db, "app_config", "api_keys");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().gemini_key : null;
        } catch (error) {
            console.error("Error fetching API Key:", error);
            return null;
        }
    };

    const uploadFileToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        try {
            const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Upload failed:", error);
            return null;
        }
    };

    // --- UPDATED AI LOGIC (FILE ONLY) ---
    const generateQuizWithAI = async (file) => {
        try {
            if (!file) return null; // STRICT CHECK: No file = No quiz

            const apiKey = await getGeminiKey();
            if (!apiKey) {
                alert("AI Service is unavailable.");
                return null;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            let prompt = `
                You are a quiz generator. Analyze the content and generate exactly 20 questions in this specific breakdown:
                
                1. 10 Multiple Choice Questions (type: "multiple_choice")
                2. 5 Identification Questions (type: "identification") - The user must type the answer.
                3. 5 Situational/Application Questions (type: "situational") - Scenario-based multiple choice.

                The output MUST be a valid JSON array of objects. Follow this structure strictly:
                [
                    {
                        "type": "multiple_choice", 
                        "question": "Standard multiple choice question?",
                        "options": ["A", "B", "C", "D"],
                        "correct_answer": "A" 
                    },
                    {
                        "type": "identification",
                        "question": "What is the specific term for...?",
                        "options": [], 
                        "correct_answer": "The Answer"
                    },
                    {
                        "type": "situational",
                        "question": "You observe X happening. What is the best course of action?",
                        "options": ["Action A", "Action B", "Action C"],
                        "correct_answer": "Action B"
                    }
                ]
                Do not wrap in markdown code blocks. Return ONLY the raw JSON.
            `;

            const base64Data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(file);
            });

            const result = await model.generateContent([
                { inlineData: { data: base64Data, mimeType: file.type || "application/pdf" } },
                { text: prompt }
            ]);

            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("AI Generation Error:", error);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsUploading(true);

        try {
            let uploadedUrl = "";
            let quizData = null;

            if (selectedFile) {
                setStatusText("Uploading PDF...");
                uploadedUrl = await uploadFileToCloudinary(selectedFile);
            }

            // --- CHANGED: Only run AI if Toggle is ON AND File exists ---
            if (useAI && selectedFile) {
                setStatusText("Analyzing PDF & Generating Quiz...");
                quizData = await generateQuizWithAI(selectedFile);
            }

            setStatusText("Saving...");
            const dateObj = dueDate ? new Date(dueDate) : new Date();

            onSave({
                title,
                description,
                priority,
                category,
                dueDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                dueTimestamp: dateObj,
                userId: auth.currentUser?.uid,
                checklist: [],
                completed: false,

                // Icon Logic: Brain if AI used, File if PDF, Layout otherwise
                emoji: quizData ? 'brain' : (selectedFile ? 'document-text' : 'layout'),

                pdfUrl: uploadedUrl,
                pdfName: selectedFile ? selectedFile.name : "",
                hasAttachment: !!selectedFile,

                quizDataJson: quizData ? JSON.stringify(quizData) : null,
                quizAnswers: {},
                quizScore: null,
                quizCompleted: false
            });

            // Reset
            setTitle(''); setDescription(''); setCategory('Work'); setDueDate('');
            setSelectedFile(null); setUseAI(false);
            onClose();

        } catch (error) {
            alert("Error saving task.");
        } finally {
            setIsUploading(false);
            setStatusText("");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-all">
            <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-[24px] shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Create Task</h2>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Add a new item to your workspace</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-zinc-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="overflow-y-auto p-6 space-y-5">

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Task Name</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full text-sm px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="e.g., Q3 Financial Report"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Category</label>
                            <div className="flex gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 border transition-all duration-200
                                            ${category === cat.id
                                                ? cat.color + ' ring-1 ring-inset ring-current shadow-sm'
                                                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        {cat.icon}
                                        <span className="text-xs font-semibold">{cat.id}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Due Date</label>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors">
                                    <Calendar size={14} />
                                </div>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all cursor-pointer font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Priority</label>
                            <div className="bg-gray-50 dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 flex flex-col gap-1">
                                {['high', 'medium', 'low'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`py-1.5 px-3 rounded-md text-xs font-medium capitalize transition-all text-left flex items-center justify-between
                                            ${priority === p
                                                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
                                            }`}
                                    >
                                        {p}
                                        {priority === p && <Flag size={12} className={p === 'high' ? 'text-rose-500' : p === 'medium' ? 'text-amber-500' : 'text-blue-500'} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full h-full min-h-[100px] px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none text-xs leading-relaxed"
                                placeholder="Add notes (e.g., study material)."
                            ></textarea>
                        </div>
                    </div>

                    {/* --- AI TOGGLE (DISABLED IF NO FILE) --- */}
                    <div className={`mt-2 p-4 rounded-xl border flex items-center justify-between transition-all duration-300
                        ${selectedFile
                            ? 'bg-gray-50 dark:bg-zinc-900/50 border-gray-100 dark:border-zinc-800'
                            : 'bg-gray-50/50 dark:bg-zinc-900/30 border-gray-100 dark:border-zinc-800 opacity-60 cursor-not-allowed'
                        }`}>

                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${useAI ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : 'bg-gray-200 dark:bg-zinc-800 text-gray-400'}`}>
                                <Sparkles size={18} className={useAI ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Generate AI Quiz
                                    {!selectedFile && <span className="text-[9px] bg-gray-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase">PDF Required</span>}
                                </h3>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                                    {selectedFile ? "Create 20 questions from the uploaded file." : "Upload a file to enable quiz generation."}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={!selectedFile} // DISABLED BUTTON
                            onClick={() => setUseAI(!useAI)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ease-in-out focus:outline-none 
                                ${!selectedFile ? 'cursor-not-allowed bg-gray-200 dark:bg-zinc-800' : (useAI ? 'bg-purple-600' : 'bg-gray-300 dark:bg-zinc-700')}
                            `}
                        >
                            <span className={`absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm ${useAI ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Attachments</label>
                            {selectedFile && useAI && (
                                <span className="text-[9px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Sparkles size={10} /> AI Ready
                                </span>
                            )}
                        </div>

                        {!selectedFile ? (
                            <label className="group flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 hover:bg-teal-50/50 dark:hover:bg-teal-900/10 hover:border-teal-400 dark:hover:border-teal-600 transition-all cursor-pointer">
                                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                                    <UploadCloud size={18} className="text-gray-400 group-hover:text-teal-500 mb-2 transition-colors" />
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                                        <span className="font-bold text-teal-600 group-hover:underline">Click to upload</span>
                                    </p>
                                </div>
                                <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.png" />
                            </label>
                        ) : (
                            <div className="flex items-center justify-between w-full p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-teal-900 flex items-center justify-center text-teal-600">
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-teal-900 dark:text-teal-100 line-clamp-1">{selectedFile.name}</span>
                                        <span className="text-[10px] text-teal-600/80">
                                            {useAI ? "AI will analyze this PDF" : "File attached"}
                                        </span>
                                    </div>
                                </div>
                                <button type="button" onClick={removeFile} className="p-1.5 rounded-lg hover:bg-white/50 text-teal-700">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 transition-all">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait
                            ${useAI ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'}
                        `}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>{statusText || "Processing..."}</span>
                            </>
                        ) : (
                            <>
                                {useAI ? <Sparkles size={14} /> : <CheckSquare size={14} />}
                                <span>{useAI ? 'Create & Generate' : 'Create Task'}</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AddTaskModal;