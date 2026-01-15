import React, { useRef, useState, useEffect } from 'react';
import {
    PenTool, Eraser, Pencil,
    Grid, AlignJustify, File, Check,
    Hand, Image as ImageIcon, MousePointer2
} from 'lucide-react';

const CanvasNote = ({ image, onSave }) => {
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // --- TOOLS & STATE ---
    const [tool, setTool] = useState('pen');
    const [paperType, setPaperType] = useState('blank');
    const [color, setColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [palmRejection, setPalmRejection] = useState(true); // Default to TRUE for better tablet UX
    const [eraserMode, setEraserMode] = useState('standard');

    // --- DATA ---
    const [strokes, setStrokes] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);
    const [addedImages, setAddedImages] = useState([]);

    // --- SELECTION & RESIZING STATE ---
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [interactionMode, setInteractionMode] = useState(null); // 'drawing', 'dragging', 'resizing'
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeHandle, setResizeHandle] = useState(null); // 'tl', 'tr', 'bl', 'br'
    const [initialResizeState, setInitialResizeState] = useState(null);

    const colors = ['#000000', '#FFFFFF', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7'];

    useEffect(() => {
        if (image) {
            const img = new Image();
            img.onload = () => redrawAll(strokes, addedImages, img);
            img.src = image;
        } else {
            redrawAll(strokes, addedImages, null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle Dark Mode Default Color
    useEffect(() => {
        if (document.documentElement.classList.contains('dark') && color === '#000000') setColor('#FFFFFF');
    }, []);

    // --- REDRAW LOGIC ---
    const redrawAll = (strokeList = strokes, imageList = addedImages, bgImgOverride = null) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Background (Only draw if passed specifically or from initial prop ONCE)
        // We use the bgImgOverride if provided (usually during init), otherwise we rely on what's implicitly cleared.
        // NOTE: Since we want to keep layers separate, we treat 'image' prop as the "Base Layer"
        if (bgImgOverride) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
            ctx.drawImage(bgImgOverride, 0, 0);
        } else if (image) {
            const img = new Image();
            img.src = image;
            if (img.complete && img.naturalWidth !== 0) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(img, 0, 0);
            }
        }

        // 2. Added Images
        imageList.forEach((imgData, index) => {
            ctx.globalAlpha = imgData.opacity;
            ctx.drawImage(imgData.img, imgData.x, imgData.y, imgData.width, imgData.height);

            // Draw Selection Box & Handles
            if (index === selectedImageIndex) {
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = '#00CED1';
                ctx.lineWidth = 2;
                ctx.strokeRect(imgData.x, imgData.y, imgData.width, imgData.height);

                // Draw Resize Handles
                const handles = getResizeHandles(imgData);
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#00CED1';
                ctx.lineWidth = 2;

                Object.values(handles).forEach(h => {
                    ctx.beginPath();
                    ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                });
            }
        });

        // 3. Strokes
        strokeList.forEach(stroke => {
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

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

            if (stroke.points.length > 0) {
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
            }
            ctx.stroke();
        });

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    };

    // --- HELPER: Resize Handles ---
    const getResizeHandles = (img) => {
        return {
            tl: { x: img.x, y: img.y }, // Top Left
            tr: { x: img.x + img.width, y: img.y }, // Top Right
            bl: { x: img.x, y: img.y + img.height }, // Bottom Left
            br: { x: img.x + img.width, y: img.y + img.height } // Bottom Right
        };
    };

    // --- IMAGE UPLOAD ---
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const newImg = {
                    img: img,
                    x: 200, y: 200,
                    width: 300,
                    height: 300 * (img.height / img.width),
                    opacity: 1.0
                };
                const newImageList = [...addedImages, newImg];
                setAddedImages(newImageList);
                setSelectedImageIndex(newImageList.length - 1);
                // We don't force 'move' tool anymore, touch logic handles it
                redrawAll(strokes, newImageList);
                save();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleOpacityChange = (e) => {
        if (selectedImageIndex === null) return;
        const newOpacity = parseFloat(e.target.value);
        const updatedImages = [...addedImages];
        updatedImages[selectedImageIndex].opacity = newOpacity;
        setAddedImages(updatedImages);
        redrawAll(strokes, updatedImages);
    };

    const save = () => {
        if (canvasRef.current) onSave(canvasRef.current.toDataURL());
    };

    // --- SMART POINTER LOGIC (Canva Style) ---
    const getCoordinates = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    // 1. POINTER DOWN
    const startAction = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // --- SMART DETECTION ---
        // If using Pen, we DRAW (unless specifically in Move tool).
        // If using TOUCH/MOUSE, we prioritize SELECT/MOVE/RESIZE.
        const isPen = e.pointerType === 'pen';
        const isTouchOrMouse = !isPen;

        // If Palm Rejection is ON, we ignore touch for drawing, 
        // BUT we allow touch to manipulate images (Move/Resize) because that's intuitive.

        const { x, y } = getCoordinates(e, canvas);

        // A. CHECK FOR RESIZE HANDLES (Highest Priority)
        if (selectedImageIndex !== null) {
            const img = addedImages[selectedImageIndex];
            const handles = getResizeHandles(img);
            const handleRadius = 20; // Hitbox size

            for (const [key, handle] of Object.entries(handles)) {
                if (Math.hypot(handle.x - x, handle.y - y) < handleRadius) {
                    setInteractionMode('resizing');
                    setResizeHandle(key);
                    setInitialResizeState({
                        x: x, y: y,
                        imgX: img.x, imgY: img.y,
                        width: img.width, height: img.height
                    });
                    return; // Stop here, we are resizing
                }
            }
        }

        // B. CHECK FOR IMAGE CLICK (Selection / Move)
        // If user touches an image, we assume they want to move it, UNLESS they explicitly selected 'Eraser'
        if (tool !== 'eraser' && (isTouchOrMouse || tool === 'move')) {
            for (let i = addedImages.length - 1; i >= 0; i--) {
                const img = addedImages[i];
                if (x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height) {
                    setSelectedImageIndex(i);
                    setInteractionMode('dragging');
                    setDragOffset({ x: x - img.x, y: y - img.y });
                    redrawAll(); // Draw selection border
                    return; // Stop here, we are moving
                }
            }
        }

        // Deselect if clicking empty space with touch
        if (isTouchOrMouse && selectedImageIndex !== null) {
            setSelectedImageIndex(null);
            redrawAll();
            // Don't return, allow drawing to start if tool is selected
        }

        // C. DRAWING (Lowest Priority for Touch, Highest for Pen)
        // If we are here, we didn't hit a resize handle or an image.

        // If it's a finger and Palm Rejection is ON, do NOT draw.
        if (palmRejection && !isPen) return;

        e.preventDefault(); // Stop scrolling
        setIsDrawing(true);
        setInteractionMode('drawing');

        // ... Drawing Setup (Same as before) ...
        if (tool === 'eraser' && eraserMode === 'object') {
            eraseStrokeAt(x, y);
            return;
        }

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

        // Immediate Draw
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

    // 2. POINTER MOVE
    const moveAction = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        e.preventDefault(); // Prevent scrolling
        const { x, y } = getCoordinates(e, canvas);

        // --- RESIZING LOGIC ---
        if (interactionMode === 'resizing' && selectedImageIndex !== null) {
            const img = addedImages[selectedImageIndex];
            const init = initialResizeState;
            const dx = x - init.x;
            const dy = y - init.y;

            let newX = img.x;
            let newY = img.y;
            let newW = img.width;
            let newH = img.height;

            // Maintain aspect ratio? Let's say yes for now.
            // Simplified resizing logic:
            if (resizeHandle === 'br') {
                newW = init.width + dx;
                newH = init.height + dy;
            } else if (resizeHandle === 'bl') {
                newX = init.imgX + dx;
                newW = init.width - dx;
                newH = init.height + dy;
            } else if (resizeHandle === 'tr') {
                newY = init.imgY + dy;
                newW = init.width + dx;
                newH = init.height - dy;
            } else if (resizeHandle === 'tl') {
                newX = init.imgX + dx;
                newY = init.imgY + dy;
                newW = init.width - dx;
                newH = init.height - dy;
            }

            // Minimum size
            if (newW < 20) newW = 20;
            if (newH < 20) newH = 20;

            const updatedImages = [...addedImages];
            updatedImages[selectedImageIndex] = { ...img, x: newX, y: newY, width: newW, height: newH };
            setAddedImages(updatedImages);
            redrawAll(strokes, updatedImages);
            return;
        }

        // --- DRAGGING LOGIC ---
        if (interactionMode === 'dragging' && selectedImageIndex !== null) {
            const updatedImages = [...addedImages];
            updatedImages[selectedImageIndex] = {
                ...updatedImages[selectedImageIndex],
                x: x - dragOffset.x,
                y: y - dragOffset.y
            };
            setAddedImages(updatedImages);
            redrawAll(strokes, updatedImages);
            return;
        }

        // --- DRAWING LOGIC ---
        if (interactionMode === 'drawing' && isDrawing) {
            if (tool === 'eraser' && eraserMode === 'object') {
                eraseStrokeAt(x, y);
                return;
            }

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
                    } else {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = currentStroke.color;
                        ctx.lineWidth = currentStroke.width;
                        ctx.globalAlpha = currentStroke.opacity;
                    }
                    ctx.stroke();
                }
            }
        }
    };

    // 3. POINTER UP
    const stopAction = (e) => {
        setInteractionMode(null); // Reset mode
        setResizeHandle(null);
        setIsDrawing(false);

        if (interactionMode === 'dragging' || interactionMode === 'resizing') {
            save(); // Save changes
            return;
        }

        if (currentStroke) {
            const newStrokes = [...strokes, currentStroke];
            setStrokes(newStrokes);
            setCurrentStroke(null);
            save();
        } else if (tool === 'eraser' && eraserMode === 'object') {
            save();
        }
    };

    const eraseStrokeAt = (ex, ey) => {
        const threshold = 15;
        const remainingStrokes = strokes.filter(stroke => {
            if (stroke.isEraser) return true;
            const hit = stroke.points.some(p => Math.sqrt(Math.pow(p.x - ex, 2) + Math.pow(p.y - ey, 2)) < threshold + (stroke.width / 2));
            return !hit;
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

                    {/* Tools */}
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm shrink-0">
                        {/* We keep 'Move' tool just in case, but touch logic handles it too */}
                        <button onClick={() => setTool('move')} className={`p-2 rounded-md ${tool === 'move' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-400'}`} title="Select/Move"><MousePointer2 size={16} /></button>

                        <button onClick={() => setTool('pen')} className={`p-2 rounded-md ${tool === 'pen' ? 'bg-teal-50 text-teal-600 shadow-sm' : 'text-gray-400'}`}><PenTool size={16} /></button>
                        <button onClick={() => setTool('pencil')} className={`p-2 rounded-md ${tool === 'pencil' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400'}`}><Pencil size={16} /></button>
                        <button onClick={() => setTool('eraser')} className={`p-2 rounded-md ${tool === 'eraser' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-400'}`}><Eraser size={16} /></button>
                    </div>

                    {/* Image Tool */}
                    <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm shrink-0">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md text-gray-400 hover:text-purple-600 transition-colors" title="Add Image">
                            <ImageIcon size={16} />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>

                    {/* Dynamic Controls */}
                    {tool === 'eraser' ? (
                        <div className="flex items-center gap-2 px-2 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800">
                            <button onClick={() => setEraserMode('standard')} className={`px-2 py-1 text-[10px] font-bold rounded ${eraserMode === 'standard' ? 'bg-gray-100 dark:bg-zinc-800' : 'text-gray-400'}`}>Pixel</button>
                            <button onClick={() => setEraserMode('object')} className={`px-2 py-1 text-[10px] font-bold rounded ${eraserMode === 'object' ? 'bg-gray-100 dark:bg-zinc-800' : 'text-gray-400'}`}>Object</button>
                        </div>
                    ) : tool === 'move' ? (
                        <div className="px-2 text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded">
                            Tap image to resize
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                                {colors.map(c => (
                                    <button key={c} onClick={() => setColor(c)} className={`w-4 h-4 rounded-full border ${color === c ? 'ring-2 ring-teal-500' : ''}`} style={{ backgroundColor: c }} />
                                ))}
                            </div>
                            <input type="range" min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} className="w-16 accent-teal-600" />
                        </div>
                    )}
                </div>

                {/* Opacity Slider */}
                {selectedImageIndex !== null && (
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-lg border border-purple-100 dark:border-purple-800">
                        <span className="text-[9px] font-bold text-purple-600 uppercase">Img Opacity</span>
                        <input type="range" min="0.1" max="1" step="0.1" value={addedImages[selectedImageIndex]?.opacity || 1} onChange={handleOpacityChange} onMouseUp={save} className="w-20 accent-purple-600" />
                    </div>
                )}

                {/* Right Controls */}
                <div className="flex items-center gap-3 ml-auto">
                    <button onClick={() => setPalmRejection(!palmRejection)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase ${palmRejection ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white text-gray-400'}`}>
                        {palmRejection ? <PenTool size={14} /> : <Hand size={14} />} {palmRejection ? "Pencil Only" : "Touch Mode"}
                    </button>
                    <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-lg border">
                        {[{ id: 'blank', icon: <File size={14} /> }, { id: 'ruled', icon: <AlignJustify size={14} /> }, { id: 'grid', icon: <Grid size={14} /> }].map(p => (
                            <button key={p.id} onClick={() => setPaperType(p.id)} className={`p-1.5 rounded ${paperType === p.id ? 'bg-gray-100 dark:bg-zinc-800' : 'text-gray-400'}`}>{p.icon}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-white dark:bg-zinc-950 cursor-crosshair touch-none">
                <div className="absolute inset-0 pointer-events-none" style={getBackgroundStyle()} />
                <canvas
                    ref={canvasRef} width={1600} height={1000}
                    className="w-full h-full touch-none relative z-10"
                    onPointerDown={startAction} onPointerMove={moveAction}
                    onPointerUp={stopAction} onPointerLeave={stopAction}
                />
            </div>
        </div>
    );
};

export default CanvasNote;