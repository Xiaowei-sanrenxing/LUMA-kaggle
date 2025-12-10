import { CanvasLayer, GuideLine } from '../types';

export const generateId = () => `layer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const SNAP_THRESHOLD = 5;

interface SnapResult {
  x: number | null;
  y: number | null;
  guides: GuideLine[];
}

export const calculateLayerSize = (naturalW: number, naturalH: number, targetMax: number) => {
  const ratio = naturalW / naturalH;
  // Ensure the longest side fits within targetMax while preserving aspect ratio
  if (naturalW > naturalH) {
    return { width: targetMax, height: targetMax / ratio };
  } else {
    return { width: targetMax * ratio, height: targetMax };
  }
};

// Calculate snapping to other layers and canvas center
export const calculateSnap = (
  activeNode: { x: number; y: number; width: number; height: number; rotation: number },
  otherNodes: CanvasLayer[],
  canvasWidth: number = 2000, // Virtual canvas size for center
  canvasHeight: number = 2000
): SnapResult => {
  let newX: number | null = null;
  let newY: number | null = null;
  const guides: GuideLine[] = [];

  // Define simplified points of interest (Edges and Center)
  const activeLeft = activeNode.x;
  const activeRight = activeNode.x + activeNode.width;
  const activeCenterX = activeNode.x + activeNode.width / 2;
  
  const activeTop = activeNode.y;
  const activeBottom = activeNode.y + activeNode.height;
  const activeCenterY = activeNode.y + activeNode.height / 2;

  // 1. Snap to Canvas Center
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  if (Math.abs(activeCenterX - centerX) < SNAP_THRESHOLD) {
    newX = centerX - activeNode.width / 2;
    guides.push({ orientation: 'vertical', position: centerX });
  }
  if (Math.abs(activeCenterY - centerY) < SNAP_THRESHOLD) {
    newY = centerY - activeNode.height / 2;
    guides.push({ orientation: 'horizontal', position: centerY });
  }

  // 2. Snap to other layers
  otherNodes.forEach(node => {
    if (!node.visible) return;

    const nodeLeft = node.x;
    const nodeRight = node.x + node.width;
    const nodeCenterX = node.x + node.width / 2;

    const nodeTop = node.y;
    const nodeBottom = node.y + node.height;
    const nodeCenterY = node.y + node.height / 2;

    // X-Axis Snapping
    // Left align
    if (Math.abs(activeLeft - nodeLeft) < SNAP_THRESHOLD) {
      newX = nodeLeft;
      guides.push({ orientation: 'vertical', position: nodeLeft });
    }
    // Right align
    if (Math.abs(activeRight - nodeRight) < SNAP_THRESHOLD) {
      newX = nodeRight - activeNode.width;
      guides.push({ orientation: 'vertical', position: nodeRight });
    }
    // Center align
    if (Math.abs(activeCenterX - nodeCenterX) < SNAP_THRESHOLD) {
      newX = nodeCenterX - activeNode.width / 2;
      guides.push({ orientation: 'vertical', position: nodeCenterX });
    }

    // Y-Axis Snapping
    // Top align
    if (Math.abs(activeTop - nodeTop) < SNAP_THRESHOLD) {
      newY = nodeTop;
      guides.push({ orientation: 'horizontal', position: nodeTop });
    }
    // Bottom align
    if (Math.abs(activeBottom - nodeBottom) < SNAP_THRESHOLD) {
      newY = nodeBottom - activeNode.height;
      guides.push({ orientation: 'horizontal', position: nodeBottom });
    }
    // Center align
    if (Math.abs(activeCenterY - nodeCenterY) < SNAP_THRESHOLD) {
      newY = nodeCenterY - activeNode.height / 2;
      guides.push({ orientation: 'horizontal', position: nodeCenterY });
    }
  });

  return { x: newX, y: newY, guides };
};
