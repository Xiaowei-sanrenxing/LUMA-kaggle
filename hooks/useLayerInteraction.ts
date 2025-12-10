import React, { useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store';
import { calculateSnap } from '../utils/helpers';
import { CanvasLayer, ResizeHandle } from '../types';

interface InteractionProps {
  layer: CanvasLayer;
  zoom: number;
}

export const useLayerInteraction = ({ layer, zoom }: InteractionProps) => {
  const { 
    updateLayer, 
    selectLayer, 
    selectLayers,
    selectedLayerIds,
    getLayers,
    setGuidelines,
    recordHistory 
  } = useAppStore();
  
  const layers = getLayers();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Refs for drag state
  const dragRef = useRef({
    startX: 0, startY: 0,
    // Store initial positions for ALL selected layers to handle multi-drag
    initialPositions: new Map<string, { x: number, y: number }>(),
    initialW: 0, initialH: 0,
    initialRotate: 0
  });

  // --- DRAGGING ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (layer.locked) return;

    recordHistory();
    
    // Multi-select & Group logic:
    let activeIds = [...selectedLayerIds];

    if (e.shiftKey) {
        // Toggle Logic
        if (selectedLayerIds.includes(layer.id)) {
            // Deselect
            activeIds = activeIds.filter(id => id !== layer.id);
            selectLayers(activeIds);
            // Don't start drag if we just deselected it
            return;
        } else {
            // Add to selection
            // Handle group addition logic
            if (layer.groupId) {
                 const groupIds = layers.filter(l => l.groupId === layer.groupId).map(l => l.id);
                 // Add all group members that aren't already there
                 groupIds.forEach(gid => {
                     if (!activeIds.includes(gid)) activeIds.push(gid);
                 });
            } else {
                 activeIds.push(layer.id);
            }
            selectLayers(activeIds);
        }
    } else {
        // Standard Click Logic (Single select unless already selected)
        if (!selectedLayerIds.includes(layer.id)) {
            if (layer.groupId) {
                // Select entire group immediately
                const groupIds = layers.filter(l => l.groupId === layer.groupId).map(l => l.id);
                selectLayers(groupIds);
                activeIds = groupIds;
            } else {
                // Select single
                selectLayer(layer.id);
                activeIds = [layer.id];
            }
        }
        // If clicked on a layer ALREADY selected, we keep selection as is to allow dragging the group
    }

    setIsDragging(true);

    // Capture initial positions of ALL active layers
    const initialMap = new Map();
    activeIds.forEach(id => {
        const l = layers.find(item => item.id === id);
        if (l) initialMap.set(id, { x: l.x, y: l.y });
    });

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPositions: initialMap,
      initialW: layer.width,
      initialH: layer.height,
      initialRotate: layer.rotation
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;

      // 1. Calculate Leader's raw new pos (The one under mouse)
      // If we clicked a grouped item, 'layer' is the one we clicked, so it's the leader.
      const initialLeaderPos = dragRef.current.initialPositions.get(layer.id);
      if (!initialLeaderPos) return; // Should not happen

      let leaderNextX = initialLeaderPos.x + dx;
      let leaderNextY = initialLeaderPos.y + dy;
      
      // 2. Snap Leader
      // Snap against layers NOT in the current selection set
      const otherLayers = layers.filter(o => !dragRef.current.initialPositions.has(o.id));
      const snapResult = calculateSnap(
        { x: leaderNextX, y: leaderNextY, width: layer.width, height: layer.height, rotation: layer.rotation },
        otherLayers
      );
      
      const finalLeaderX = snapResult.x !== null ? snapResult.x : leaderNextX;
      const finalLeaderY = snapResult.y !== null ? snapResult.y : leaderNextY;
      
      setGuidelines(snapResult.guides);
      
      // 3. Calculate True Delta (How much did leader actually move?)
      const trueDx = finalLeaderX - initialLeaderPos.x;
      const trueDy = finalLeaderY - initialLeaderPos.y;
      
      // 4. Apply to all active layers
      dragRef.current.initialPositions.forEach((pos, id) => {
          updateLayer(id, { x: pos.x + trueDx, y: pos.y + trueDy });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setGuidelines([]); // Clear guides
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [layer, zoom, layers, selectedLayerIds, updateLayer, selectLayer, selectLayers, setGuidelines, recordHistory]);

  // --- RESIZING (Only Single Layer for now) ---
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (layer.locked) return;

    recordHistory();
    setIsResizing(true);
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPositions: new Map(), // Unused for resize
      initialX: layer.x, // Legacy prop for resize logic below
      initialY: layer.y,
      initialW: layer.width,
      initialH: layer.height,
      initialRotate: layer.rotation
    } as any;

    const ratio = layer.width / layer.height;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      
      // Accessing legacy props stored in 'any' cast above
      let newX = (dragRef.current as any).initialX;
      let newY = (dragRef.current as any).initialY;
      let newW = (dragRef.current as any).initialW;
      let newH = (dragRef.current as any).initialH;

      // Basic resizing logic based on handle
      if (handle.includes('e')) newW = (dragRef.current as any).initialW + dx;
      if (handle.includes('w')) {
        newW = (dragRef.current as any).initialW - dx;
        newX = (dragRef.current as any).initialX + dx;
      }
      if (handle.includes('s')) newH = (dragRef.current as any).initialH + dy;
      if (handle.includes('n')) {
        newH = (dragRef.current as any).initialH - dy;
        newY = (dragRef.current as any).initialY + dy;
      }

      // Force Aspect Ratio for Images by default (or if Shift is held for others)
      const shouldLockRatio = layer.type === 'image' || ev.shiftKey;

      if (shouldLockRatio) {
         if (handle === 'se' || handle === 'sw' || handle === 'ne' || handle === 'nw') {
             newH = newW / ratio;
             if (handle.includes('n')) {
                 newY = (dragRef.current as any).initialY + ((dragRef.current as any).initialH - newH);
             }
         }
      }

      // Min Size
      if (newW < 20) newW = 20;
      if (newH < 20) newH = 20;

      updateLayer(layer.id, {
        x: newX, y: newY, width: newW, height: newH
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [layer, zoom, updateLayer, recordHistory]);

  return {
    handleDragStart,
    handleResizeStart,
    isDragging,
    isResizing
  };
};