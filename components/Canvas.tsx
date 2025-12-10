import React, { useState, useRef, useEffect } from 'react';
import { CanvasLayer, ResizeHandle } from '../types';
import { useLayerInteraction } from '../hooks/useLayerInteraction';
import { FloatingToolbar } from './FloatingToolbar';
import { Move, MousePointer2 } from 'lucide-react';

// 单个图层组件
const LayerComponent: React.FC<{
  layer: CanvasLayer;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<CanvasLayer>) => void;
  onSelect: (id: string, multi: boolean) => void;
}> = (props) => {
  const { layer, isSelected, zoom } = props;
  const { handleDragStart, handleResizeStart } = useLayerInteraction(props);

  return (
    <div
      onMouseDown={handleDragStart}
      className={`absolute select-none group ${layer.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
      style={{
        transform: `translate(${layer.x}px, ${layer.y}px) rotate(${layer.rotation}deg)`,
        width: layer.width,
        height: layer.height,
        zIndex: layer.zIndex,
        opacity: layer.opacity,
      }}
    >
      {/* 内容渲染 */}
      <div className="w-full h-full overflow-hidden relative">
        {layer.type === 'image' && layer.src && (
          <img src={layer.src} alt={layer.name} className="w-full h-full object-cover pointer-events-none" />
        )}
        {layer.type === 'text' && layer.text && (
          <div className="w-full h-full whitespace-pre-wrap">{layer.text}</div>
        )}
        {layer.type === 'shape' && (
          <div className="w-full h-full bg-blue-500" />
        )}
      </div>

      {/* 选中态 UI (边框和控制柄) */}
      {isSelected && !layer.locked && (
        <>
          {/* 边框 */}
          <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none" />
          
          {/* 缩放手柄 (仅展示角落的4个作为示例) */}
          {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
            <div
              key={handle}
              onMouseDown={(e) => handleResizeStart(e, handle)}
              className={`absolute w-3 h-3 bg-white border border-indigo-500 rounded-full z-10 cursor-${handle}-resize`}
              style={{
                top: handle.includes('n') ? -6 : 'auto',
                bottom: handle.includes('s') ? -6 : 'auto',
                left: handle.includes('w') ? -6 : 'auto',
                right: handle.includes('e') ? -6 : 'auto',
              }}
            />
          ))}
          
          {/* 旋转手柄 */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-grab shadow-sm">
             <div className="w-1 h-3 bg-gray-300 rounded-full" />
          </div>
        </>
      )}
    </div>
  );
};

// 画布主组件
export const Canvas: React.FC = () => {
  const [layers, setLayers] = useState<CanvasLayer[]>([
    {
      id: '1', type: 'image', name: 'Background', 
      src: 'https://images.unsplash.com/photo-1513151233558-d860c5398176', 
      x: 100, y: 100, width: 400, height: 300, rotation: 0, zIndex: 1, 
      opacity: 1, locked: false, visible: true, borderRadius: 0
    },
    {
      id: '2', type: 'text', name: 'Title', 
      text: 'HELLO WORLD', 
      x: 200, y: 200, width: 200, height: 60, rotation: 0, zIndex: 2, 
      opacity: 1, 
      locked: false, visible: true, borderRadius: 0,
      textStyle: { 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: 'white', 
          fontFamily: 'Arial', 
          fontStyle: 'normal', 
          align: 'center', 
          effect: 'shadow'
      }
    }
  ]);
  
  const [selection, setSelection] = useState<string[]>([]);
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 监听空格键用于画布漫游
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(true);
      // Delete 键删除
      if (e.code === 'Delete' && selection.length) {
        setLayers(ls => ls.filter(l => !selection.includes(l.id)));
        setSelection([]);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selection]);

  // 画布漫游 (Pan)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      // Zoom
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setViewState(s => ({ ...s, zoom: Math.min(Math.max(0.1, s.zoom + delta), 5) }));
    } else if (isSpacePressed) {
      // Pan
      setViewState(s => ({ ...s, x: s.x - e.deltaX, y: s.y - e.deltaY }));
    }
  };

  // 更新图层
  const updateLayer = (id: string, updates: Partial<CanvasLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // 选中图层
  const selectedLayer = layers.find(l => selection.includes(l.id)) || null;

  return (
    <div className="w-full h-screen bg-gray-100 overflow-hidden relative flex flex-col">
      {/* 顶部简单的 Info Bar */}
      <div className="h-12 bg-white border-b flex items-center px-4 justify-between z-10">
        <span className="font-bold text-gray-700">Editor Canvas</span>
        <div className="text-xs text-gray-400">
           {Math.round(viewState.zoom * 100)}% • {selection.length > 0 ? `${selection.length} Selected` : 'No Selection'}
        </div>
      </div>

      {/* 浮动工具栏 */}
      <FloatingToolbar />

      {/* 画布视口 */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onWheel={handleWheel}
        onMouseDown={() => {
            if(!isSpacePressed) setSelection([]); // 点击空白处取消选中
        }}
      >
        {/* 实际的画布内容区域 */}
        <div 
          style={{
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
          }}
          className="relative transition-transform duration-75 ease-out"
        >
           {/* 画布背景 (Artboard) */}
           <div 
             className="absolute bg-white shadow-2xl"
             style={{ 
               left: '50%', top: '50%', 
               width: 800, height: 600, 
               transform: 'translate(-50%, -50%)' 
             }}
             onMouseDown={(e) => e.stopPropagation()} // 防止触发取消选中
           >
              {layers.map(layer => (
                <LayerComponent
                  key={layer.id}
                  layer={layer}
                  isSelected={selection.includes(layer.id)}
                  zoom={viewState.zoom}
                  onSelect={(id, multi) => setSelection(multi ? [...selection, id] : [id])}
                  onUpdate={updateLayer}
                />
              ))}
           </div>
        </div>

        {/* 覆盖层：显示快捷操作提示 */}
        {isSpacePressed && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur pointer-events-none flex items-center gap-2">
                <Move size={16} /> 拖拽移动画布
            </div>
        )}
      </div>
    </div>
  );
};