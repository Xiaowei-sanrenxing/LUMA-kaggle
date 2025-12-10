
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';
import { LayerItem } from './LayerItem';
import { FloatingToolbar } from './FloatingToolbar';
import { HeaderControls, FooterControls } from './CanvasControls';
import { Rulers } from './Rulers';
import { ContextMenu } from './ContextMenu';
import { Undo, Redo, Smartphone, Aperture } from 'lucide-react';
import { motion } from 'framer-motion';

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const CanvasArea: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    getLayers, selectedLayerIds, selectLayer, selectLayers, guidelines, history, undo, redo,
    showSafeArea, setShowSafeArea, scale, setScale, canvasSize,
    updateLayer, removeSelectedLayers, duplicateLayer, toggleLayerLock, groupSelectedLayers, ungroupSelectedLayers
  } = useAppStore();

  const layers = getLayers();
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Key Event Handlers (Enhanced)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inputting text
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Pan Mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); 
        setIsSpacePressed(true);
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') { removeSelectedLayers(); }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { 
          e.preventDefault(); 
          selectedLayerIds.forEach(id => duplicateLayer(id));
      }

      // Group / Ungroup
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
          e.preventDefault();
          if (e.shiftKey) ungroupSelectedLayers();
          else groupSelectedLayers();
      }

      // Lock
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
           e.preventDefault();
           selectedLayerIds.forEach(id => toggleLayerLock(id));
      }

      // Nudge (Arrow Keys) - Professional Feature
      if (selectedLayerIds.length > 0) {
          const step = e.shiftKey ? 10 : 1; // Shift + Arrow = 10px
          let dx = 0;
          let dy = 0;
          
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;

          if (dx !== 0 || dy !== 0) {
              e.preventDefault();
              selectedLayerIds.forEach(id => {
                  const layer = layers.find(l => l.id === id);
                  if (layer && !layer.locked) {
                      updateLayer(id, { x: layer.x + dx, y: layer.y + dy });
                  }
              });
          }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') { setIsSpacePressed(false); setIsPanning(false); }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [undo, redo, selectedLayerIds, layers, updateLayer, removeSelectedLayers, duplicateLayer, toggleLayerLock, groupSelectedLayers, ungroupSelectedLayers]);

  // Wheel Zoom/Pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setScale(Math.min(Math.max(0.1, scale + delta), 5));
    } else {
        setViewOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 0. Close Context Menu if clicking elsewhere
    if (contextMenu) setContextMenu(null);

    // 1. Pan Mode
    if (isSpacePressed || e.button === 1) { 
        setIsPanning(true); 
        e.preventDefault(); 
        return;
    } 
    
    // 2. Click on empty Canvas -> Start Selection Box
    if (e.target === e.currentTarget && containerRef.current && e.button === 0) { 
        if (!e.shiftKey) selectLayer(null); // Clear selection unless shift held
        
        const rect = containerRef.current.getBoundingClientRect();
        // Adjust for Rulers offset (20px)
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
    }
  };

  // Right Click Handler
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      // If clicking on a layer (handled by bubbling or specific logic), we might already have selection.
      // If clicking empty space, maybe minimal menu?
      // For now, simple logic: show menu at mouse position
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning
    if (isPanning) {
        setViewOffset(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        return;
    }

    // Selection Box Update
    if (selectionBox && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSelectionBox(prev => prev ? ({ 
            ...prev, 
            currentX: e.clientX - rect.left, 
            currentY: e.clientY - rect.top 
        }) : null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);

    // Commit Selection Box
    if (selectionBox) {
        // Calculate intersection
        const x = Math.min(selectionBox.startX, selectionBox.currentX);
        const y = Math.min(selectionBox.startY, selectionBox.currentY);
        const w = Math.abs(selectionBox.currentX - selectionBox.startX);
        const h = Math.abs(selectionBox.currentY - selectionBox.startY);
        
        if (w > 5 || h > 5) {
            // Convert to Canvas Space accounting for Rulers offset implicitly via ViewOffset calculation logic or just raw relative
            // viewOffset includes the pan. scale includes zoom.
            // The logic below assumes viewOffset is the translation of the artboard relative to container center
            
            // Correction: The artboard transform is `translate(viewOffset.x, viewOffset.y) scale(scale)`
            // But the SelectionBox is in "Screen" coordinates relative to container.
            
            // We need to convert Box Screen Coords -> Artboard Local Coords.
            // Artboard Screen X = viewOffset.x + (ContainerWidth/2 ? No, CSS says justify-center so it depends)
            // Actually simpler: The Artboard div centers itself via flex if we don't have absolute positioning on it?
            // Wait, the artboard has `translate` applied.
            
            // Let's rely on the fact that `LayerItem` uses `layer.x` relative to artboard 0,0.
            // Artboard 0,0 in Screen space is `viewOffset.x` (if we ignore centering logic for a moment, assuming viewOffset starts at 0,0 relative to container).
            // Actually viewOffset is just delta.
            
            // Let's assume container is flex-center. 
            // Better approach: Calculate Artboard Client Rect.
            const artboardEl = document.getElementById('canvas-artboard');
            if (artboardEl) {
                const artRect = artboardEl.getBoundingClientRect();
                const containerRect = containerRef.current!.getBoundingClientRect();
                
                // Box relative to Container
                const boxScreenL = selectionBox.startX < selectionBox.currentX ? selectionBox.startX : selectionBox.currentX;
                const boxScreenT = selectionBox.startY < selectionBox.currentY ? selectionBox.startY : selectionBox.currentY;
                const boxScreenR = boxScreenL + w;
                const boxScreenB = boxScreenT + h;
                
                // Convert Box to Screen Absolute (add container left/top)
                const absBoxL = boxScreenL + containerRect.left;
                const absBoxT = boxScreenT + containerRect.top;
                const absBoxR = boxScreenR + containerRect.left;
                const absBoxB = boxScreenB + containerRect.top;

                const intersectedIds = layers.filter(layer => {
                    if (!layer.visible || layer.locked) return false;
                    
                    // Layer in Screen Space
                    // layer.x is relative to Artboard Left.
                    // Screen X = artRect.left + layer.x * scale
                    const lScreenL = artRect.left + layer.x * scale;
                    const lScreenT = artRect.top + layer.y * scale;
                    const lScreenR = lScreenL + layer.width * scale;
                    const lScreenB = lScreenT + layer.height * scale;
                    
                    // Intersection Test
                    return !(lScreenR < absBoxL || lScreenL > absBoxR || lScreenB < absBoxT || lScreenT > absBoxB);
                }).map(l => l.id);

                if (intersectedIds.length > 0) {
                    selectLayers(intersectedIds);
                }
            }
        }
        setSelectionBox(null);
    }
  };

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 100; 
    const scaleW = (clientWidth - padding) / canvasSize.width;
    const scaleH = (clientHeight - padding) / canvasSize.height;
    setScale(Math.min(scaleW, scaleH, 1.2)); 
    setViewOffset({ x: 0, y: 0 });
  }, [canvasSize, setScale]);

  // Initialize scale
  useEffect(() => { 
    setScale(0.85);
    setViewOffset({ x: 0, y: 0 });
  }, [canvasSize.width, canvasSize.height, setScale]);

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F5F5F0] dark:bg-studio-950 font-sans select-none transition-colors duration-300">
      
      {/* Top Toolbar */}
      <div className="h-16 flex items-center justify-between px-6 shrink-0 z-30 relative pointer-events-none bg-white/50 dark:bg-studio-900/50 backdrop-blur-sm border-b border-studio-200/50 dark:border-studio-800/50">
        
        {/* Left: Branding & Undo/Redo */}
        <div className="flex items-center gap-6 pointer-events-auto">
             
             {/* Brand Logo - LUMA - Clean Transparent Version */}
             <div className="flex items-center gap-3 select-none group cursor-pointer">
                 <motion.div 
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.6 }}
                    className="w-8 h-8 bg-studio-900 dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-studio-900 shadow-md"
                 >
                     <Aperture size={18} strokeWidth={2} />
                 </motion.div>
                 <div className="flex flex-col">
                    <span className="text-sm font-bold text-studio-900 dark:text-white tracking-wide leading-none group-hover:text-indigo-600 transition-colors">LUMA</span>
                    <span className="text-[8px] font-semibold text-studio-400 dark:text-studio-500 tracking-widest uppercase leading-none mt-0.5">Editor</span>
                 </div>
             </div>

             <div className="h-4 w-px bg-studio-300/40" />

             {/* Undo/Redo */}
             <div className="bg-white/80 dark:bg-studio-900/80 backdrop-blur-md rounded-full px-2 py-1 shadow-sm border border-white/50 dark:border-studio-700/50 flex items-center gap-4">
                <div className="flex">
                    <button onClick={undo} disabled={history.past.length === 0} className="p-2 text-studio-600 dark:text-studio-300 hover:text-studio-900 dark:hover:text-white rounded-full disabled:opacity-30 transition-all" title="Undo (Ctrl+Z)"><Undo size={16}/></button>
                    <button onClick={redo} disabled={history.future.length === 0} className="p-2 text-studio-600 dark:text-studio-300 hover:text-studio-900 dark:hover:text-white rounded-full disabled:opacity-30 transition-all" title="Redo (Ctrl+Y)"><Redo size={16}/></button>
                </div>
                <div className="h-3 w-px bg-studio-200 dark:bg-studio-700"></div>
                <button 
                    onClick={() => setShowSafeArea(!showSafeArea)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showSafeArea ? 'text-studio-900 dark:text-white' : 'text-studio-500 dark:text-studio-400 hover:text-studio-800 dark:hover:text-studio-200'}`}
                >
                    <Smartphone size={14} />
                    <span>安全区</span>
                </button>
             </div>
        </div>

        {/* Center: Floating Toolbar */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-50">
             <FloatingToolbar />
        </div>
        
        {/* Right: Header Controls */}
        <div className="pointer-events-auto">
            <HeaderControls />
        </div>
      </div>

      {/* Main Viewport */}
      <div 
        ref={containerRef}
        className={`flex-1 relative flex items-center justify-center overflow-hidden ${isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsPanning(false); setSelectionBox(null); }}
        onContextMenu={handleContextMenu}
      >
         {/* PROFESSIONAL RULERS */}
         <Rulers 
            zoom={scale} 
            offsetX={viewOffset.x + (containerRef.current?.clientWidth || 0)/2 - (canvasSize.width * scale)/2} 
            offsetY={viewOffset.y + (containerRef.current?.clientHeight || 0)/2 - (canvasSize.height * scale)/2}
            width={containerRef.current?.clientWidth || 1000}
            height={containerRef.current?.clientHeight || 1000}
         />

         {/* Minimal Dot Grid Background */}
         <div 
           className="absolute inset-0 z-0 pointer-events-none opacity-[0.4] dark:opacity-[0.2]"
           style={{
             backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
             backgroundSize: `${20 * scale}px ${20 * scale}px`, 
             backgroundPosition: `${viewOffset.x}px ${viewOffset.y}px` 
           }}
         />
         
         {/* Panning Overlay */}
         {isSpacePressed && <div className="absolute inset-0 z-50 bg-transparent" />}

         {/* Selection Box Overlay */}
         {selectionBox && (
             <div 
                className="absolute bg-indigo-500/10 border border-indigo-500 z-[9999] pointer-events-none"
                style={{
                    left: Math.min(selectionBox.startX, selectionBox.currentX),
                    top: Math.min(selectionBox.startY, selectionBox.currentY),
                    width: Math.abs(selectionBox.currentX - selectionBox.startX),
                    height: Math.abs(selectionBox.currentY - selectionBox.startY),
                }}
             />
         )}

         {/* The Artboard */}
         <div
           id="canvas-artboard"
           style={{
             width: canvasSize.width,
             height: canvasSize.height,
             transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${scale})`,
             transformOrigin: 'center center',
             transition: isPanning ? 'none' : 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
           }}
           className="relative bg-white shadow-2xl shadow-black/5 ring-1 ring-black/5 shrink-0 transition-shadow duration-300"
         >
            {layers.map(layer => (
                <LayerItem 
                    key={layer.id} 
                    layer={layer} 
                    isSelected={selectedLayerIds.includes(layer.id)} 
                    zoom={scale} 
                />
            ))}

            {showSafeArea && (
                <div className="absolute inset-0 pointer-events-none z-[100] border-[12px] border-studio-900/5">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[30px] bg-studio-900/10 rounded-b-2xl backdrop-blur-sm" />
                </div>
            )}

            {/* Smart Guides */}
            {guidelines.map((guide, i) => (
                <div 
                    key={i}
                    className="absolute bg-pink-500 pointer-events-none z-[200] shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                    style={{
                        left: guide.orientation === 'vertical' ? guide.position : 0,
                        top: guide.orientation === 'horizontal' ? guide.position : 0,
                        width: guide.orientation === 'vertical' ? '1px' : '100%',
                        height: guide.orientation === 'horizontal' ? '1px' : '100%',
                    }}
                />
            ))}
         </div>
      </div>

      <FooterControls onFitToScreen={handleFitToScreen} />

      {/* Context Menu Portal */}
      {contextMenu && (
          <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}

    </div>
  );
};
