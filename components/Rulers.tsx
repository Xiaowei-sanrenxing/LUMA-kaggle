
import React, { useMemo } from 'react';

interface RulersProps {
  zoom: number;
  offsetX: number;
  offsetY: number;
  width: number; // Viewport width
  height: number; // Viewport height
  unit?: number; // Base unit, default 100
}

export const Rulers: React.FC<RulersProps> = ({ 
  zoom, 
  offsetX, 
  offsetY, 
  width, 
  height,
  unit = 100 
}) => {
  const RULER_THICKNESS = 20;
  const STEP = Math.max(50, Math.ceil(100 / zoom / 50) * 50); // Dynamic step based on zoom

  // Generate ticks for Horizontal Ruler
  const horizontalTicks = useMemo(() => {
    const start = Math.floor(-offsetX / zoom / STEP) * STEP;
    const end = Math.floor((width - offsetX) / zoom / STEP) * STEP;
    const ticks = [];
    
    for (let i = start; i <= end; i += STEP) {
      const screenX = i * zoom + offsetX;
      ticks.push(
        <g key={`h-${i}`} transform={`translate(${screenX}, 0)`}>
          <line x1="0" y1="0" x2="0" y2={RULER_THICKNESS} stroke="#71717a" strokeWidth="1" opacity="0.5" />
          <text x="2" y="14" fontSize="9" fill="#71717a" className="select-none font-mono">{i}</text>
        </g>
      );
      // Sub-ticks
      for(let j=1; j<5; j++) {
          const subX = (i + (STEP/5)*j) * zoom + offsetX;
          ticks.push(<line key={`h-sub-${i}-${j}`} x1={subX} y1={RULER_THICKNESS-5} x2={subX} y2={RULER_THICKNESS} stroke="#a1a1aa" strokeWidth="1" opacity="0.5" />);
      }
    }
    return ticks;
  }, [zoom, offsetX, width, STEP]);

  // Generate ticks for Vertical Ruler
  const verticalTicks = useMemo(() => {
    const start = Math.floor(-offsetY / zoom / STEP) * STEP;
    const end = Math.floor((height - offsetY) / zoom / STEP) * STEP;
    const ticks = [];

    for (let i = start; i <= end; i += STEP) {
      const screenY = i * zoom + offsetY;
      ticks.push(
        <g key={`v-${i}`} transform={`translate(0, ${screenY})`}>
          <line x1="0" y1="0" x2={RULER_THICKNESS} y2="0" stroke="#71717a" strokeWidth="1" opacity="0.5" />
          <text x="2" y="10" fontSize="9" fill="#71717a" className="select-none font-mono" transform="rotate(-90, 2, 10)">{i}</text>
        </g>
      );
      // Sub-ticks
      for(let j=1; j<5; j++) {
          const subY = (i + (STEP/5)*j) * zoom + offsetY;
          ticks.push(<line key={`v-sub-${i}-${j}`} x1={RULER_THICKNESS-5} y1={subY} x2={RULER_THICKNESS} y2={subY} stroke="#a1a1aa" strokeWidth="1" opacity="0.5" />);
      }
    }
    return ticks;
  }, [zoom, offsetY, height, STEP]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Corner Box */}
      <div className="absolute top-0 left-0 w-[20px] h-[20px] bg-studio-100 dark:bg-studio-800 border-r border-b border-studio-200 dark:border-studio-700 z-30" />

      {/* Horizontal Ruler */}
      <div className="absolute top-0 left-[20px] right-0 h-[20px] bg-studio-50 dark:bg-studio-900 border-b border-studio-200 dark:border-studio-700 overflow-hidden">
        <svg width="100%" height="100%">
           {horizontalTicks}
        </svg>
      </div>

      {/* Vertical Ruler */}
      <div className="absolute top-[20px] left-0 bottom-0 w-[20px] bg-studio-50 dark:bg-studio-900 border-r border-studio-200 dark:border-studio-700 overflow-hidden">
        <svg width="100%" height="100%">
           {verticalTicks}
        </svg>
      </div>
    </div>
  );
};
