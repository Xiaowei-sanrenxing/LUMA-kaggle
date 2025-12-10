

import React, { useEffect, useRef, useState } from 'react';
import { CanvasLayer, ResizeHandle } from '../types';
import { useLayerInteraction } from '../hooks/useLayerInteraction';
import { useAppStore } from '../store';
import { Pencil } from 'lucide-react';

interface LayerItemProps {
  layer: CanvasLayer;
  isSelected: boolean;
  zoom: number;
}

export const LayerItem: React.FC<LayerItemProps> = ({ layer, isSelected, zoom }) => {
  const { handleDragStart, handleResizeStart, isDragging } = useLayerInteraction({ layer, zoom });
  const { maskingLayerId, setMaskExportFn, updateLayer } = useAppStore();
  
  const isMasking = maskingLayerId === layer.id;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // --- Text Editing State ---
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Masking Logic ---
  useEffect(() => {
      if (isMasking && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              // Initialize canvas transparently
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Visual Red for User
              ctx.lineWidth = 20;
          }

          // Register export function
          setMaskExportFn(() => {
              if (!canvasRef.current) return null;
              
              // Create a temp canvas to generate the black/white mask for AI
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              const tempCtx = tempCanvas.getContext('2d');
              
              if (tempCtx) {
                  // Fill black
                  tempCtx.fillStyle = '#000000';
                  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                  
                  // Draw the user's strokes as White
                  tempCtx.drawImage(canvas, 0, 0);
                  
                  const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                  const data = imgData.data;
                  for (let i = 0; i < data.length; i += 4) {
                      const alpha = data[i + 3];
                      if (alpha > 0) {
                          // Make it pure white
                          data[i] = 255;
                          data[i + 1] = 255;
                          data[i + 2] = 255;
                          data[i + 3] = 255;
                      }
                  }
                  tempCtx.putImageData(imgData, 0, 0);
                  
                  return tempCanvas.toDataURL('image/png');
              }
              return null;
          });
      }
      
      return () => setMaskExportFn(null);
  }, [isMasking, setMaskExportFn]);

  const startDrawing = (e: React.MouseEvent) => {
      if (!isMasking || !canvasRef.current) return;
      e.stopPropagation(); // Stop drag
      setIsDrawing(true);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.beginPath();
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent) => {
      if (!isDrawing || !isMasking || !canvasRef.current) return;
      e.stopPropagation();
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          ctx.stroke();
      }
  };

  const stopDrawing = () => {
      if (isDrawing) setIsDrawing(false);
  };

  // --- Text Editing Handlers ---
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (layer.locked || isMasking) return;
    if (layer.type === 'text') {
        e.stopPropagation();
        setIsEditing(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateLayer(layer.id, { text: e.target.value });
  };

  const finishEditing = () => { setIsEditing(false); };

  useEffect(() => {
      if (isEditing && textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
      }
  }, [isEditing]);

  // --- Styles ---

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${layer.x}px`,
    top: `${layer.y}px`,
    width: `${layer.width}px`,
    height: `${layer.height}px`,
    // Apply Rotation and Flip via Scale
    transform: `rotate(${layer.rotation}deg) scale(${layer.scaleX || 1}, ${layer.scaleY || 1})`,
    zIndex: isMasking ? 9999 : layer.zIndex, // Bring to front when masking
    opacity: layer.opacity,
    borderRadius: `${layer.borderRadius}px`,
    cursor: layer.locked ? 'not-allowed' : isMasking ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
    pointerEvents: layer.visible ? 'auto' : 'none',
    display: layer.visible ? 'block' : 'none',
  };

  const contentStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    borderRadius: `${layer.borderRadius}px`,
    overflow: 'hidden',
    filter: layer.filters 
      ? `brightness(${layer.filters.brightness}%) contrast(${layer.filters.contrast}%) saturate(${layer.filters.saturate}%) blur(${layer.filters.blur}px) grayscale(${layer.filters.grayscale}%)`
      : 'none',
    boxShadow: layer.shadow 
      ? `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color}`
      : 'none',
  };
  
  if (layer.mask === 'circle') contentStyle.borderRadius = '50%';

  const textStyle: React.CSSProperties = layer.textStyle ? {
    fontSize: `${layer.textStyle.fontSize}px`,
    fontFamily: layer.textStyle.fontFamily,
    fontWeight: layer.textStyle.fontWeight,
    fontStyle: layer.textStyle.fontStyle,
    color: layer.textStyle.color,
    textAlign: layer.textStyle.align,
    WebkitTextStroke: layer.textStyle.strokeWidth ? `${layer.textStyle.strokeWidth}px ${layer.textStyle.strokeColor}` : 'none',
    textShadow: layer.textStyle.effect === 'shadow' ? '2px 2px 4px rgba(0,0,0,0.5)' : 
                layer.textStyle.effect === 'neon' ? `0 0 5px ${layer.textStyle.color}, 0 0 10px ${layer.textStyle.color}` : 'none',
    // New Props
    lineHeight: layer.textStyle.lineHeight ?? 1.2,
    letterSpacing: `${layer.textStyle.letterSpacing ?? 0}em`,
  } : {};

  return (
    <div 
      className={`group transition-shadow duration-200 select-none`}
      style={containerStyle}
      onMouseDown={isMasking ? startDrawing : handleDragStart}
      onMouseMove={isMasking ? draw : undefined}
      onMouseUp={isMasking ? stopDrawing : undefined}
      onMouseLeave={isMasking ? stopDrawing : undefined}
      onDoubleClick={handleDoubleClick}
    >
      <div style={contentStyle}>
        {layer.type === 'image' && layer.src && (
          <img src={layer.src} alt={layer.name} crossOrigin="anonymous" className="w-full h-full object-fill pointer-events-none" draggable={false} />
        )}
        {layer.type === 'text' && (
           isEditing ? (
             <textarea
                ref={textareaRef}
                value={layer.text}
                onChange={handleTextChange}
                onBlur={finishEditing}
                onKeyDown={(e) => { if (e.key === 'Escape') finishEditing(); }}
                className="w-full h-full bg-transparent outline-none resize-none p-0 border-none overflow-hidden"
                style={{
                    ...textStyle,
                    cursor: 'text',
                    pointerEvents: 'auto',
                }}
                onMouseDown={(e) => e.stopPropagation()}
             />
           ) : (
            <div className="w-full h-full flex items-center justify-center pointer-events-none" style={textStyle}>
                {layer.text || "Double click to edit"}
            </div>
           )
        )}
      </div>

      {/* MASKING OVERLAY */}
      {isMasking && (
          <canvas 
            ref={canvasRef}
            width={layer.width}
            height={layer.height}
            className="absolute inset-0 z-[100] cursor-crosshair touch-none"
            style={{ borderRadius: `${layer.borderRadius}px` }}
          />
      )}

      {/* SELECTION UI (Hidden during masking to reduce clutter) */}
      {isSelected && !layer.locked && !isMasking && (
        <>
          <div className="absolute -inset-[1px] border border-studio-900 pointer-events-none z-50" />
          {/* Only show resize handles if single select (simplification for MVP) */}
          {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((h) => (
            <div
              key={h}
              onMouseDown={(e) => handleResizeStart(e, h)}
              className={`absolute w-2.5 h-2.5 bg-white border border-studio-900 z-50 cursor-${h}-resize flex items-center justify-center`}
              style={{
                top: h.includes('n') ? -5 : 'auto',
                bottom: h.includes('s') ? -5 : 'auto',
                left: h.includes('w') ? -5 : 'auto',
                right: h.includes('e') ? -5 : 'auto',
              }}
            />
          ))}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-studio-900 text-studio-900 rounded-full flex items-center justify-center z-50 cursor-pointer hover:bg-studio-900 hover:text-white transition-colors">
             <div className="w-1.5 h-1.5 bg-current rounded-full" />
          </div>

          {/* Text Edit Button */}
          {layer.type === 'text' && !isEditing && (
              <div 
                  onMouseDown={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="absolute -top-8 right-0 bg-white border border-studio-900 text-studio-900 rounded-md px-2 py-0.5 text-[10px] font-bold z-50 cursor-pointer hover:bg-studio-900 hover:text-white flex items-center gap-1 shadow-sm"
              >
                  <Pencil size={10} /> 编辑
              </div>
          )}
        </>
      )}

      {!isSelected && !layer.locked && !isMasking && (
        <div className="absolute inset-0 border border-studio-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </div>
  );
};