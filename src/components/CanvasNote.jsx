import React, { useRef, useState, useEffect } from 'react';
import {
    PenTool, Eraser, Pencil,
    Grid, AlignJustify, File, Check,
    Hand, MousePointer2, RefreshCcw
} from 'lucide-react';

const CanvasNote = ({ image, onSave }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // --- STATE ---
    const [tool, setTool] = useState('pen'); // 'pen', 'pencil', 'eraser'
    const [paperType, setPaperType] = useState('blank');
    const [color, setColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(3);

    // NEW: Toggles
    const [palmRejection, setPalmRejection] = useState(false); // Ignore fingers?
    const [eraserMode, setEraserMode] = useState('standard'); // 'standard' (pixel) or 'object' (stroke)

    // Store all strokes: { points: [], color, width, opacity, isEraser: boolean }
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);

    const colors = [
        '#000000', '#FFFFFF', '#EF4444', '#F97316',
        '#EAB308', '#22C55E', '#3B82F6', '#A855F7'
    ];

    // --- INITIALIZATION ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && image) {
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = image;
        }
    }, []);

    useEffect(() => {
        if (document.documentElement.classList.contains('dark') && color === '#000000') {
            setColor('#FFFFFF');
        }
    }, []);

    // --- REDRAW LOGIC (Handles Object Deletion + Standard Erasing) ---
    const redrawAll = (strokeList = strokes) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // 1. Clear Screen
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Background Image (if any)
        if (image) {
            const img = new Image();
            img.src = image;
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(img, 0, 0);
        }

        // 3. Replay ALL Strokes
        strokeList.forEach(stroke => {
            ctx.beginPath();

            // Critical: Eraser strokes must use 'destination-out' to cut through previous ink
            if (stroke.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = stroke.width;
                ctx.globalAlpha = 1.0;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.width;
                ctx.globalAlpha = stroke.opacity;
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (stroke.points.length > 0) {
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
            }
            ctx.stroke();
        });

        // Reset defaults
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    };

    // --- POINTER COORDINATES ---
    const getCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    // --- MAIN DRAWING HANDLERS (Using Pointer Events for Stylus Support) ---
    const startDrawing = (e) => {
        // PALM REJECTION CHECK
        if (palmRejection && e.pointerType !== 'pen') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Prevent scrolling on touch
        e.preventDefault();

        const { x, y } = getCoordinates(e, canvas);
        setIsDrawing(true);

        // OBJECT ERASER LOGIC
        if (tool === 'eraser' && eraserMode === 'object') {
            eraseStrokeAt(x, y);
            return;
        }

        // START NEW STROKE (Pen, Pencil, or Standard Eraser)
        const isStandardEraser = tool === 'eraser' && eraserMode === 'standard';

        const newStroke = {
            points: [{ x, y }],
            color: isStandardEraser ? '#000000' : color,
            width: isStandardEraser ? strokeWidth * 5 : (tool === 'pencil' ? strokeWidth : strokeWidth),
            opacity: tool === 'pencil' ? 0.8 : 1.0,
            tool: tool,
            isEraser: isStandardEraser
        };

        setCurrentStroke(newStroke);

        // VISUAL FEEDBACK (Draw immediately)
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.lineCap = 'round';

        if (isStandardEraser) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = newStroke.width;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = newStroke.color;
            ctx.lineWidth = newStroke.width;
            ctx.globalAlpha = newStroke.opacity;
        }
        ctx.stroke();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (palmRejection && e.pointerType !== 'pen') return;

        e.preventDefault();
        const canvas = canvasRef.current;
        const { x, y } = getCoordinates(e, canvas);

        // OBJECT ERASER: Continually check collisions while dragging
        if (tool === 'eraser' && eraserMode === 'object') {
            eraseStrokeAt(x, y);
            return;
        }

        // NORMAL DRAWING
        if (currentStroke) {
            currentStroke.points.push({ x, y });

            const ctx = canvas.getContext('2d');
            const points = currentStroke.points;

            if (points.length >= 2) {
                const prev = points[points.length - 2];
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(x, y);
                ctx.lineCap = 'round';

                if (currentStroke.isEraser) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.lineWidth = currentStroke.width;
                    ctx.globalAlpha = 1.0;
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = currentStroke.color;
                    ctx.lineWidth = currentStroke.width;
                    ctx.globalAlpha = currentStroke.opacity;
                }
                ctx.stroke();
            }
        }
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        if (palmRejection && e.pointerType !== 'pen' && e.pointerType !== undefined) return;

        setIsDrawing(false);

        if (currentStroke) {
            // Save completed stroke to history
            const newStrokes = [...strokes, currentStroke];
            setStrokes(newStrokes);
            setCurrentStroke(null);

            // Auto-save image
            if (canvasRef.current) onSave(canvasRef.current.toDataURL());
        }
        else if (tool === 'eraser' && eraserMode === 'object') {
            // Just save the image state after object erasure
            if (canvasRef.current) onSave(canvasRef.current.toDataURL());
        }
    };

    // --- OBJECT ERASER HELPER ---
    const eraseStrokeAt = (ex, ey) => {
        const threshold = 15; // Hitbox size

        const remainingStrokes = strokes.filter(stroke => {
            if (stroke.isEraser) return true; // Don't "object erase" standard eraser marks (optional choice)

            const hit = stroke.points.some(p => {
                const dist = Math.sqrt(Math.pow(p.x - ex, 2) + Math.pow(p.y - ey, 2));
                return dist < threshold + (stroke.width / 2);
            });
            return !hit; // Keep if not hit
        });

        if (remainingStrokes.length !== strokes.length) {
            setStrokes(remainingStrokes);
            redrawAll(remainingStrokes);
        }
    };

    const getBackgroundStyle = () => {
        const isDark = document.documentElement.classList.contains('dark');
        const lineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        if (paperType === 'ruled') return { backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px)`, backgroundSize: '100% 30px' };
        if (paperType === 'grid') return { backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`, backgroundSize: '20px 20px' };
        return {};
    };

    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-zinc-950">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 shrink-0 gap-2 md:gap-0">

                <div className="flex items-center gap-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">

                    {/* 1. Tools */}
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm shrink-0">
                        <button onClick={() => setTool('pen')} className={`p-2 rounded-md transition-all ${tool === 'pen' ? 'bg-teal-50 text-teal-600 shadow-sm dark:bg-teal-900/20 dark:text-teal-400' : 'text-gray-400 hover:text-gray-600'}`} title="Pen"><PenTool size={16} /></button>
                        <button onClick={() => setTool('pencil')} className={`p-2 rounded-md transition-all ${tool === 'pencil' ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`} title="Pencil"><Pencil size={16} /></button>
                        <button onClick={() => setTool('eraser')} className={`p-2 rounded-md transition-all ${tool === 'eraser' ? 'bg-red-50 text-red-600 shadow-sm dark:bg-red-900/20 dark:text-red-400' : 'text-gray-400 hover:text-gray-600'}`} title="Eraser"><Eraser size={16} /></button>
                    </div>

                    {/* 2. DYNAMIC CONTROLS (Changes based on Tool) */}

                    {/* ERASER TOGGLES */}
                    {tool === 'eraser' ? (
                        <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-left-2 duration-200">
                            <div className="flex bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-gray-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setEraserMode('standard')}
                                    className={`px-2 py-1.5 text-[10px] font-bold rounded-md transition-all ${eraserMode === 'standard' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => setEraserMode('object')}
                                    className={`px-2 py-1.5 text-[10px] font-bold rounded-md transition-all ${eraserMode === 'object' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                                >
                                    Object
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* COLOR & THICKNESS (For Pen/Pencil) */
                        <>
                            <div className="flex items-center gap-1.5 shrink-0 px-2">
                                {colors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-5 h-5 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-1 ring-teal-500' : ''}`}
                                        style={{ backgroundColor: c }}
                                    >
                                        {color === c && <Check size={10} className={c === '#FFFFFF' ? 'text-black' : 'text-white'} />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 border-l border-gray-200 dark:border-zinc-800 pl-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                                <input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-16 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            </div>
                        </>
                    )}
                </div>

                {/* 3. RIGHT SIDE: Palm Rejection & Paper */}
                <div className="flex items-center gap-3 ml-auto shrink-0">

                    {/* PALM REJECTION TOGGLE */}
                    <button
                        onClick={() => setPalmRejection(!palmRejection)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wide
                            ${palmRejection
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800'
                                : 'bg-white border-gray-200 text-gray-400 dark:bg-zinc-900 dark:border-zinc-800'
                            }`}
                        title="Only allows drawing with Apple Pencil/Stylus"
                    >
                        {palmRejection ? <PenTool size={14} /> : <Hand size={14} />}
                        {palmRejection ? "Pencil Only" : "Touch Mode"}
                    </button>

                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                        {[
                            { id: 'blank', icon: <File size={16} /> },
                            { id: 'ruled', icon: <AlignJustify size={16} /> },
                            { id: 'grid', icon: <Grid size={16} /> }
                        ].map((p) => (
                            <button key={p.id} onClick={() => setPaperType(p.id)} className={`p-2 rounded-md transition-all ${paperType === p.id ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                {p.icon}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CANVAS */}
            <div className="flex-1 relative overflow-hidden bg-white dark:bg-zinc-950 cursor-crosshair touch-none">
                <div className="absolute inset-0 pointer-events-none" style={getBackgroundStyle()} />

                <canvas
                    ref={canvasRef}
                    width={1600}
                    height={1000}
                    className="w-full h-full touch-none relative z-10"
                    // Replaced Mouse/Touch events with POINTER events for stylus support
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                />
            </div>
        </div>
    );
};

export default CanvasNote;