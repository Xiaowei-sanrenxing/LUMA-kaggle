
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, Copy, Lock, Unlock, Layers, 
  Sliders, 
  BringToFront, SendToBack, ArrowUp, ArrowDown,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  AlignLeft, AlignRight, AlignCenter, ArrowUpToLine, ArrowDownToLine,
  FlipHorizontal, FlipVertical, Droplets,
  Download, Eraser, RefreshCw, Scan, Brush, ImageMinus, Maximize,
  Loader2, AlertCircle, Check, X, Pencil,
  Group, Ungroup,
  Type, Palette, Sparkles, // Text Icons
  Bold, Italic, 
  MoveVertical, MoveHorizontal, ChevronDown // New icons for text props
} from 'lucide-react';
import { useAppStore } from '../store';
import { CanvasLayer, AspectRatio, AIActionType } from '../types';
import { generateImage } from '../services/geminiService';

type MenuType = 'none' | 'filters' | 'arrange' | 'style' | 'textStyle' | 'textColor' | 'textEffect';

// Helper: Ensure we have a base64 string for the API
const getBase64Image = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src;
    try {
        const response = await fetch(src, { mode: 'cors' });
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Image Fetch Error:", e);
        throw new Error("无法读取图片数据，请确保图片支持跨域访问或已上传到本地。");
    }
};

// Helper: Calculate Aspect Ratio
const getClosestRatio = (width: number, height: number): AspectRatio => {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 0.75) < 0.1) return '3:4';
    if (Math.abs(ratio - 1.33) < 0.1) return '4:3';
    if (Math.abs(ratio - 0.56) < 0.1) return '9:16';
    if (Math.abs(ratio - 1.77) < 0.1) return '16:9';
    return '1:1'; // Default
};

const FONT_FAMILIES = [
    { value: 'Inter', label: '默认黑体 (Sans)' },
    { value: 'serif', label: '优雅衬线 (Serif)' },
    { value: 'cursive', label: '手写体 (Hand)' },
    { value: 'monospace', label: '代码体 (Mono)' },
];

const TEXT_COLORS = [
    '#18181b', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
];

export const FloatingToolbar: React.FC = () => {
  const { 
    selectedLayerIds, getLayers, updateLayer, removeSelectedLayers, removeLayer,
    duplicateLayer, toggleLayerLock, moveLayer, canvasSize,
    setMaskingMode, maskingLayerId, maskingAction, maskExportFn,
    groupSelectedLayers, ungroupSelectedLayers,
    addLayer
  } = useAppStore();

  const layers = getLayers();
  const [activeMenu, setActiveMenu] = useState<MenuType>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const primaryLayerId = selectedLayerIds[selectedLayerIds.length - 1];
  const selectedLayer = layers.find(l => l.id === primaryLayerId);
  const isMultiSelect = selectedLayerIds.length > 1;

  const canUngroup = selectedLayerIds.length > 0 && selectedLayerIds.some(id => layers.find(l => l.id === id)?.groupId);
  const canGroup = selectedLayerIds.length > 1;

  const isMasking = maskingLayerId === primaryLayerId;
  const isTextLayer = selectedLayer?.type === 'text';
  
  if (!selectedLayer && selectedLayerIds.length === 0) return null;

  const toggleMenu = (menu: MenuType) => setActiveMenu(activeMenu === menu ? 'none' : menu);

  const handleUpdate = (updates: Partial<CanvasLayer>) => {
    if (primaryLayerId) updateLayer(primaryLayerId, updates, true);
  };

  const handleTextUpdate = (textUpdates: Partial<CanvasLayer['textStyle']>) => {
      if (!selectedLayer || !selectedLayer.textStyle) return;
      handleUpdate({
          textStyle: { ...selectedLayer.textStyle, ...textUpdates }
      });
  };

  const handleDownload = () => {
    if (selectedLayer && selectedLayer.type === 'image' && selectedLayer.src) {
        const link = document.createElement('a');
        link.href = selectedLayer.src;
        link.download = `layer-${selectedLayer.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("仅支持图片图层下载");
    }
  };

  const initiateAIAction = (actionType: AIActionType) => {
      if (['eraser', 'inpainting', 'local_redraw'].includes(actionType)) {
          if (selectedLayer) setMaskingMode(selectedLayer.id, actionType);
      } else {
          executeAIAction(actionType);
      }
  };

  const confirmMaskAction = () => {
      if (maskExportFn && maskingAction) {
          const maskBase64 = maskExportFn();
          if (maskBase64) {
              executeAIAction(maskingAction, maskBase64);
          } else {
              setErrorMsg("获取蒙版失败");
          }
      }
      setMaskingMode(null, null);
  };

  const executeAIAction = async (actionType: AIActionType, maskBase64?: string) => {
    if (!selectedLayer || selectedLayer.type !== 'image' || !selectedLayer.src) return;
    
    setIsProcessing(true);
    setErrorMsg(null);
    
    try {
        const base64Src = await getBase64Image(selectedLayer.src);
        const ratio = getClosestRatio(selectedLayer.width, selectedLayer.height);

        let prompt = "";
        
        switch(actionType) {
            case 'upscale':
                prompt = "TASK: Super Resolution. ACTION: Upscale this product image to high definition (4K). Enhance sharpness.";
                break;
            case 'remove_bg':
                prompt = "TASK: Background Removal. ACTION: Extract the main subject and place on pure white background.";
                break;
            case 'eraser':
                prompt = "TASK: Eraser. ACTION: Remove object in mask and fill naturally.";
                break;
            case 'inpainting':
                prompt = "TASK: Refinement. ACTION: Redraw the masked area with higher fidelity.";
                break;
            case 'segmentation':
                prompt = "TASK: Segmentation. ACTION: Isolate subject on neon green background.";
                break;
            case 'local_redraw':
                prompt = "TASK: Detail. ACTION: Enhance fine details in masked area.";
                break;
            default:
                prompt = "Enhance image.";
        }

        const newSrc = await generateImage({
            prompt: prompt,
            aspectRatio: ratio, 
            imageSize: '2K',
            referenceImage: base64Src,
            maskImage: maskBase64,
            workflow: 'creative'
        });
        
        updateLayer(selectedLayer.id, { src: newSrc });

    } catch (e: any) {
        console.error("AI Action Failed:", e);
        const msg = e.message?.includes("CORS") ? "跨域限制，请用本地图片。" : "生成失败，请重试。";
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 3000);
    } finally {
        setIsProcessing(false);
    }
  };

  const cancelMasking = () => {
      setMaskingMode(null, null);
  };

  const handleAlign = (type: 'center' | 'middle' | 'left' | 'right' | 'top' | 'bottom') => {
      if (!selectedLayer) return;
      let x = selectedLayer.x;
      let y = selectedLayer.y;
      
      if (type === 'center') x = (canvasSize.width - selectedLayer.width) / 2;
      if (type === 'middle') y = (canvasSize.height - selectedLayer.height) / 2;
      if (type === 'left') x = 0;
      if (type === 'right') x = canvasSize.width - selectedLayer.width;
      if (type === 'top') y = 0;
      if (type === 'bottom') y = canvasSize.height - selectedLayer.height;

      handleUpdate({ x, y });
  };

  const handleFlip = (axis: 'x' | 'y') => {
      if (!selectedLayer) return;
      if (axis === 'x') handleUpdate({ scaleX: (selectedLayer.scaleX || 1) * -1 });
      if (axis === 'y') handleUpdate({ scaleY: (selectedLayer.scaleY || 1) * -1 });
  };

  const handleAddText = () => {
      if (!selectedLayer) return;
      // Add text centered on the selected layer
      const fontSize = 60;
      const width = 300;
      const height = fontSize * 1.5;
      
      addLayer({
          type: 'text',
          text: '双击或点击编辑按钮修改文字',
          name: 'Text Layer',
          x: selectedLayer.x + (selectedLayer.width - width) / 2,
          y: selectedLayer.y + (selectedLayer.height - height) / 2,
          width: width,
          height: height,
          textStyle: {
              fontSize: fontSize,
              fontFamily: 'Inter',
              fontWeight: 'bold',
              color: '#ffffff',
              align: 'center',
              effect: 'shadow'
          }
      });
  };

  // If we only have multiple selected but no primary defined (edge case), just show delete/group
  if (!selectedLayer && isMultiSelect) {
      return (
          <div className="flex flex-col items-center pointer-events-auto">
             <div className="flex items-center gap-1 p-1.5 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="px-3 text-xs text-gray-300">选中 {selectedLayerIds.length} 个图层</div>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <ToolBtn icon={Group} onClick={groupSelectedLayers} tooltip="合并图层 (Group)" />
                <ToolBtn icon={Trash2} color="text-red-400" onClick={removeSelectedLayers} tooltip="删除" />
             </div>
          </div>
      );
  }

  if (!selectedLayer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="flex flex-col items-center pointer-events-auto"
      >
        <div className={`flex items-center gap-1 p-1.5 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-black/20 text-gray-200 transition-all ${isProcessing || errorMsg ? 'px-4' : ''}`}>
          
          {errorMsg ? (
               <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-red-400">
                   <AlertCircle size={16} />
                   <span>{errorMsg}</span>
               </div>
          ) : isProcessing ? (
               <div className="flex items-center gap-3 py-1 text-sm font-medium text-gray-300">
                   <Loader2 className="animate-spin text-white" size={16} />
                   <span className="animate-pulse">AI 处理中...</span>
               </div>
          ) : isMasking ? (
             <div className="flex items-center gap-2 px-1">
                 <div className="flex items-center gap-2 mr-2 border-r border-white/10 pr-3">
                     <Pencil size={16} className="text-white animate-pulse" />
                     <span className="text-xs font-bold text-white">
                        {maskingAction === 'eraser' ? '涂抹擦除' : '涂抹编辑'}
                     </span>
                 </div>
                 <div className="flex items-center gap-1">
                     <button onClick={confirmMaskAction} className="flex items-center gap-1 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">
                         <Check size={14} strokeWidth={3} /> 执行
                     </button>
                     <button onClick={cancelMasking} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                         <X size={16} />
                     </button>
                 </div>
             </div>
          ) : (
            <>
                {isMultiSelect && (
                    <div className="px-2 text-[10px] text-gray-400 border-r border-white/10 mr-1 flex items-center gap-2">
                        <span>{selectedLayerIds.length} 选</span>
                        {/* Group/Ungroup Controls for Multi-select */}
                        {canGroup && <ToolBtn icon={Group} onClick={groupSelectedLayers} tooltip="合并图层 (Group)" active={false} />}
                        {canUngroup && <ToolBtn icon={Ungroup} onClick={ungroupSelectedLayers} tooltip="拆分图层 (Ungroup)" active={false} />}
                    </div>
                )}
                
                {/* Single Select: Show Ungroup if it is part of a group */}
                {!isMultiSelect && canUngroup && (
                    <div className="border-r border-white/10 mr-1 pr-1">
                       <ToolBtn icon={Ungroup} onClick={ungroupSelectedLayers} tooltip="拆分图层 (Ungroup)" />
                    </div>
                )}

                {/* --- TEXT MODE TOOLBAR --- */}
                {isTextLayer && !isMultiSelect && !selectedLayer.locked && (
                    <>
                        <ToolBtn icon={Type} label="样式" active={activeMenu === 'textStyle'} onClick={() => toggleMenu('textStyle')} color="text-white bg-red-500/20" />
                        <ToolBtn icon={Palette} label="颜色" active={activeMenu === 'textColor'} onClick={() => toggleMenu('textColor')} />
                        <ToolBtn icon={Sparkles} label="特效" active={activeMenu === 'textEffect'} onClick={() => toggleMenu('textEffect')} />
                        <div className="w-px h-4 bg-white/10 mx-1" />
                    </>
                )}

                {/* --- IMAGE MODE TOOLBAR --- */}
                {selectedLayer.type === 'image' && !selectedLayer.locked && !isMultiSelect && (
                    <>
                    <ToolBtn icon={Sliders} label="滤镜" active={activeMenu === 'filters'} onClick={() => toggleMenu('filters')} />
                    <ToolBtn icon={Type} label="加文字" onClick={handleAddText} />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <ToolBtn icon={Maximize} label="放大" onClick={() => initiateAIAction('upscale')} />
                    <ToolBtn icon={ImageMinus} label="抠图" onClick={() => initiateAIAction('remove_bg')} />
                    <ToolBtn icon={Eraser} label="擦除" onClick={() => initiateAIAction('eraser')} />
                    <ToolBtn icon={RefreshCw} label="重绘" onClick={() => initiateAIAction('inpainting')} />
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    </>
                )}

                {/* --- COMMON TOOLS --- */}
                {!selectedLayer.locked && (
                    <>
                        <ToolBtn icon={Layers} label="排列" active={activeMenu === 'arrange'} onClick={() => toggleMenu('arrange')} />
                    </>
                )}
                
                {!isMultiSelect && (selectedLayer.type !== 'text' || selectedLayer.locked) && (
                     <ToolBtn icon={Droplets} label="样式" active={activeMenu === 'style'} onClick={() => toggleMenu('style')} />
                )}

                {!isMultiSelect && <ToolBtn icon={Copy} onClick={() => duplicateLayer(selectedLayer.id)} tooltip="复制" />}
                
                <ToolBtn 
                    icon={selectedLayer.locked ? Lock : Unlock} 
                    onClick={() => toggleLayerLock(selectedLayer.id)} 
                    tooltip={selectedLayer.locked ? "解锁" : "锁定"} 
                    active={selectedLayer.locked} 
                    color={selectedLayer.locked ? "text-amber-400" : undefined}
                />
                
                {selectedLayer.type === 'image' && !isMultiSelect && (
                    <ToolBtn icon={Download} onClick={handleDownload} tooltip="下载" />
                )}
                
                <ToolBtn 
                    icon={Trash2} 
                    color="text-red-400 hover:bg-red-500/20 hover:text-red-300" 
                    onClick={() => isMultiSelect ? removeSelectedLayers() : removeLayer(selectedLayer.id)} 
                    tooltip="删除" 
                />
            </>
          )}

        </div>

        {/* --- POPOVERS --- */}

        {/* Text Style Popover */}
        {activeMenu === 'textStyle' && isTextLayer && (
            <Popover width="w-72">
                 <SectionLabel>字体与对齐</SectionLabel>
                 <div className="flex gap-2 mb-3">
                     {/* Font Select */}
                     <div className="relative flex-1">
                         <select 
                            value={selectedLayer.textStyle?.fontFamily}
                            onChange={(e) => handleTextUpdate({ fontFamily: e.target.value })}
                            className="w-full bg-white/10 border border-white/10 rounded-lg text-[10px] text-white py-1.5 pl-2 pr-6 outline-none appearance-none"
                         >
                            {FONT_FAMILIES.map(f => <option key={f.value} value={f.value} className="text-black">{f.label}</option>)}
                         </select>
                         <ChevronDown size={12} className="absolute right-2 top-2 text-gray-400 pointer-events-none"/>
                     </div>
                     {/* Align Toggles */}
                     <div className="flex bg-white/10 rounded-lg p-0.5">
                         <ToggleBtn icon={AlignLeft} active={selectedLayer.textStyle?.align === 'left'} onClick={() => handleTextUpdate({ align: 'left' })} />
                         <ToggleBtn icon={AlignCenter} active={selectedLayer.textStyle?.align === 'center'} onClick={() => handleTextUpdate({ align: 'center' })} />
                         <ToggleBtn icon={AlignRight} active={selectedLayer.textStyle?.align === 'right'} onClick={() => handleTextUpdate({ align: 'right' })} />
                     </div>
                 </div>

                 <SectionLabel>字号 (Size)</SectionLabel>
                 <FilterSlider value={selectedLayer.textStyle?.fontSize || 24} onChange={(v) => handleTextUpdate({ fontSize: v })} min={12} max={200} />
                 
                 <div className="flex gap-2 my-2">
                     <ToggleBtn label="加粗" icon={Bold} active={selectedLayer.textStyle?.fontWeight === 'bold'} onClick={() => handleTextUpdate({ fontWeight: selectedLayer.textStyle?.fontWeight === 'bold' ? 'normal' : 'bold' })} flex />
                     <ToggleBtn label="斜体" icon={Italic} active={selectedLayer.textStyle?.fontStyle === 'italic'} onClick={() => handleTextUpdate({ fontStyle: selectedLayer.textStyle?.fontStyle === 'italic' ? 'normal' : 'italic' })} flex />
                 </div>

                 <SectionLabel>行高 (Line Height)</SectionLabel>
                 <div className="flex items-center gap-2 mb-2">
                     <MoveVertical size={12} className="text-gray-400"/>
                     <FilterSlider noLabel value={selectedLayer.textStyle?.lineHeight || 1.2} onChange={(v) => handleTextUpdate({ lineHeight: v })} min={0.8} max={3} step={0.1} />
                 </div>

                 <SectionLabel>字间距 (Spacing)</SectionLabel>
                 <div className="flex items-center gap-2">
                     <MoveHorizontal size={12} className="text-gray-400"/>
                     <FilterSlider noLabel value={Number((selectedLayer.textStyle?.letterSpacing || 0).toString().replace('em',''))} onChange={(v) => handleTextUpdate({ letterSpacing: v })} min={-0.1} max={1} step={0.01} />
                 </div>
            </Popover>
        )}

        {/* Text Color Popover */}
        {activeMenu === 'textColor' && isTextLayer && (
            <Popover>
                <SectionLabel>文字颜色</SectionLabel>
                <div className="grid grid-cols-4 gap-2 mb-2">
                    {TEXT_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => handleTextUpdate({ color: c })}
                            className={`w-8 h-8 rounded-full border border-white/10 shadow-sm transition-transform hover:scale-110 ${selectedLayer.textStyle?.color === c ? 'ring-2 ring-white' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: selectedLayer.textStyle?.color }} />
                    <span className="text-xs text-gray-300 font-mono flex-1">{selectedLayer.textStyle?.color}</span>
                </div>
            </Popover>
        )}

        {/* Text Effects Popover */}
        {activeMenu === 'textEffect' && isTextLayer && (
            <Popover>
                 <SectionLabel>文字特效</SectionLabel>
                 <div className="space-y-1">
                     {['none', 'shadow', 'neon'].map((eff) => (
                         <button 
                            key={eff}
                            onClick={() => handleTextUpdate({ effect: eff as any })}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex justify-between
                                ${selectedLayer.textStyle?.effect === eff ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/10'}`}
                         >
                             <span className="capitalize">{eff}</span>
                             {selectedLayer.textStyle?.effect === eff && <Check size={12} />}
                         </button>
                     ))}
                 </div>
            </Popover>
        )}

        {activeMenu === 'arrange' && !isProcessing && !isMasking && (
             <Popover>
                 <SectionLabel>图层顺序</SectionLabel>
                 <div className="flex justify-between gap-1 mb-3">
                     <ActionBtn icon={BringToFront} label="置顶" onClick={() => moveLayer(selectedLayer.id, 'top')} />
                     <ActionBtn icon={ArrowUp} label="上移" onClick={() => moveLayer(selectedLayer.id, 'up')} />
                     <ActionBtn icon={ArrowDown} label="下移" onClick={() => moveLayer(selectedLayer.id, 'down')} />
                     <ActionBtn icon={SendToBack} label="置底" onClick={() => moveLayer(selectedLayer.id, 'bottom')} />
                 </div>
                 <SectionLabel>对齐 & 翻转</SectionLabel>
                 <div className="flex justify-between gap-1 mb-2">
                     <ActionBtn icon={AlignLeft} onClick={() => handleAlign('left')} />
                     <ActionBtn icon={AlignHorizontalDistributeCenter} onClick={() => handleAlign('center')} />
                     <ActionBtn icon={AlignRight} onClick={() => handleAlign('right')} />
                 </div>
                 <div className="flex gap-2">
                     <ActionBtn icon={FlipHorizontal} label="水平" onClick={() => handleFlip('x')} active={(selectedLayer.scaleX || 1) < 0} />
                     <ActionBtn icon={FlipVertical} label="垂直" onClick={() => handleFlip('y')} active={(selectedLayer.scaleY || 1) < 0} />
                 </div>
             </Popover>
        )}

        {(activeMenu === 'style') && !isTextLayer && !isProcessing && !isMasking && (
            <Popover>
                <SectionLabel>不透明度</SectionLabel>
                <div className="flex items-center gap-3 mb-2">
                    <Droplets size={14} className="text-gray-400"/>
                    <input 
                        type="range" min={0} max={1} step={0.01}
                        value={selectedLayer.opacity}
                        onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
                        className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                    />
                    <span className="text-xs tabular-nums text-gray-300 w-8 text-right">{Math.round(selectedLayer.opacity * 100)}%</span>
                </div>
            </Popover>
        )}

        {activeMenu === 'filters' && selectedLayer.filters && !isProcessing && !isMasking && (
           <Popover>
              <div className="flex justify-between items-center mb-2">
                  <SectionLabel>滤镜调节</SectionLabel>
                  <Sliders size={12} className="text-gray-400" />
              </div>
              <FilterSlider label="亮度" value={selectedLayer.filters.brightness} onChange={(v) => handleUpdate({ filters: {...selectedLayer.filters!, brightness: v} })} min={0} max={200} />
              <FilterSlider label="对比度" value={selectedLayer.filters.contrast} onChange={(v) => handleUpdate({ filters: {...selectedLayer.filters!, contrast: v} })} min={0} max={200} />
              <FilterSlider label="饱和度" value={selectedLayer.filters.saturate} onChange={(v) => handleUpdate({ filters: {...selectedLayer.filters!, saturate: v} })} min={0} max={200} />
           </Popover>
        )}

      </motion.div>
    </AnimatePresence>
  );
};

const ToolBtn = ({ icon: Icon, label, onClick, active, color, tooltip }: any) => (
  <button
    onClick={onClick}
    title={tooltip || label}
    className={`group relative p-2 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 min-w-[34px] min-h-[34px]
      ${active 
        ? 'bg-white text-black shadow-lg' 
        : `hover:bg-white/10 ${color || 'text-gray-400 hover:text-white'}`
      }`}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
    {label && !active && (
        <span className="absolute -bottom-9 bg-black/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-white/10">
            {label}
        </span>
    )}
  </button>
);

const ActionBtn = ({ icon: Icon, label, onClick, active }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 p-2 rounded-lg border flex flex-col items-center gap-1 transition-all
            ${active 
                ? 'bg-white text-black border-white' 
                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}
    >
        <Icon size={16} strokeWidth={2}/>
        {label && <span className="text-[9px] font-medium">{label}</span>}
    </button>
);

const ToggleBtn = ({ icon: Icon, label, onClick, active, flex }: any) => (
    <button 
        onClick={onClick}
        className={`p-1.5 rounded-md transition-all flex items-center justify-center gap-1.5
            ${flex ? 'flex-1 border' : ''}
            ${active 
                ? 'bg-white text-black border-white shadow-sm' 
                : 'bg-transparent text-gray-400 border-transparent hover:text-white'}`}
    >
        {Icon && <Icon size={14} strokeWidth={active ? 2.5 : 2} />}
        {label && <span className="text-[10px] font-medium">{label}</span>}
    </button>
);

const Popover: React.FC<{ children: React.ReactNode, width?: string }> = ({ children, width = "w-64" }) => (
    <motion.div 
        initial={{ opacity: 0, y: 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 8, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.98 }}
        className={`absolute top-full mt-2 ${width} p-3 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl ring-1 ring-black/20 flex flex-col gap-3 z-50`}
    >
        {children}
    </motion.div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">
        {children}
    </div>
);

const FilterSlider = ({ label, value, onChange, min, max, step = 1, noLabel }: any) => (
    <div className="flex flex-col gap-1.5 mb-1 w-full">
        {!noLabel && (
            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>{label}</span>
                <span className="text-gray-200 font-normal">{Math.round(value)}</span>
            </div>
        )}
        <input 
          type="range" min={min} max={max} step={step} value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
        />
    </div>
);
