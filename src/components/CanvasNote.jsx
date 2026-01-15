import React, { useRef, useState, useEffect } from 'react';
import {
    PenTool, Eraser, Pencil,
    Grid, AlignJustify, File, XCircle
} from 'lucide-react';

const CanvasNote = ({ image, onSave, theme = 'light' }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // --- TOOLS STATE ---
    const [tool, setTool] = useState('pen'); // 'pen', 'pencil', 'eraser'
    const [paperType, setPaperType] = useState('blank'); // 'blank', 'ruled', 'grid'

    // --- INITIALIZE CANVAS WITH IMAGE ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            // Clear and reset composite operation
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';

            if (image) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = image;
            }
        }
    }, [image]);

    // --- DRAWING LOGIC ---
    const getCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
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

        // Tool Settings
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out'; // This makes it erase
            ctx.lineWidth = 25;
        } else {
            ctx.globalCompositeOperation = 'source-over'; // Standard drawing
            const isDark = document.documentElement.classList.contains('dark');

            if (tool === 'pencil') {
                ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(50, 50, 50, 0.6)';
                ctx.lineWidth = 1; // Thinner
            } else {
                // Pen
                ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
                ctx.lineWidth = 2; // Standard
            }
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
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
                // Auto-save back to parent
                onSave(canvas.toDataURL());
            }
        }
    };

    // --- BACKGROUND STYLES (CSS Patterns) ---
    const getBackgroundStyle = () => {
        const isDark = document.documentElement.classList.contains('dark');
        const lineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        switch (paperType) {
            case 'ruled':
                return {
                    backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px)`,
                    backgroundSize: '100% 30px' // Line height
                };
            case 'grid':
                return {
                    backgroundImage: `linear-gradient(${lineColor} 1px, transparent 1px), linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                };
            default:
                return {};
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-zinc-950">
            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 shrink-0">

                {/* Writing Tools */}
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <button
                        onClick={() => setTool('pen')}
                        className={`p-1.5 rounded-md transition-all ${tool === 'pen' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Pen"
                    >
                        <PenTool size={16} />
                    </button>
                    <button
                        onClick={() => setTool('pencil')}
                        className={`p-1.5 rounded-md transition-all ${tool === 'pencil' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Pencil"
                    >
                        <Pencil size={16} />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-1.5 rounded-md transition-all ${tool === 'eraser' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Eraser"
                    >
                        <Eraser size={16} />
                    </button>
                </div>

                {/* Paper Backgrounds */}
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <button
                        onClick={() => setPaperType('blank')}
                        className={`p-1.5 rounded-md transition-all ${paperType === 'blank' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                        title="Blank"
                    >
                        <File size={16} />
                    </button>
                    <button
                        onClick={() => setPaperType('ruled')}
                        className={`p-1.5 rounded-md transition-all ${paperType === 'ruled' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                        title="Ruled"
                    >
                        <AlignJustify size={16} />
                    </button>
                    <button
                        onClick={() => setPaperType('grid')}
                        className={`p-1.5 rounded-md transition-all ${paperType === 'grid' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-400'}`}
                        title="Grid"
                    >
                        <Grid size={16} />
                    </button>
                </div>
            </div>

            {/* CANVAS CONTAINER */}
            <div className="flex-1 relative overflow-hidden bg-white dark:bg-zinc-950 cursor-crosshair">
                {/* Background Pattern Layer */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-100"
                    style={getBackgroundStyle()}
                />

                <canvas
                    ref={canvasRef}
                    width={1600}
                    height={1000}
                    className="w-full h-full touch-none relative z-10"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
        </div>
    );
};

export default CanvasNote;