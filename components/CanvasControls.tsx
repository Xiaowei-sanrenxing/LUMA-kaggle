

import React, { useState } from 'react';
import { 
  LayoutTemplate, Download, Minus, Plus, Maximize, 
  Trash2, ChevronDown, Sparkles, Loader2 
} from 'lucide-react';
import { useAppStore } from '../store';
import { AspectRatio } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const SIZES: { label: string; ratio: AspectRatio; w: number; h: number }[] = [
    { label: '3:4 (Portrait)', ratio: '3:4', w: 1080, h: 1440 },
    { label: '9:16 (Story)', ratio: '9:16', w: 1080, h: 1920 },
    { label: '1:1 (Square)', ratio: '1:1', w: 1080, h: 1080 },
    { label: '16:9 (Video)', ratio: '16:9', w: 1920, h: 1080 },
];

export const HeaderControls: React.FC = () => {
    const { canvasSize, setCanvasSize, toggleAgent, isAgentOpen } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        const artboard = document.getElementById('canvas-artboard');
        if (!artboard) return;
        
        // @ts-ignore
        if (!window.html2canvas) {
            alert("Export library not loaded");
            return;
        }

        try {
            setIsExporting(true);
            // @ts-ignore
            const canvas = await window.html2canvas(artboard, {
                scale: 2, // High resolution
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc: Document) => {
                    const clonedArtboard = clonedDoc.getElementById('canvas-artboard');
                    if (clonedArtboard) {
                        // Reset transforms to capture full size without viewport scaling
                        clonedArtboard.style.transform = 'none';
                        clonedArtboard.style.margin = '0';
                    }
                }
            });
            
            const link = document.createElement('a');
            link.download = `LUMA-Export-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Export failed", err);
            alert("导出失败，请重试");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="absolute top-4 right-6 flex items-center gap-3 z-40">
            {/* Agent Toggle */}
            <button
                onClick={toggleAgent}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border transition-all active:scale-95 text-xs font-semibold
                ${isAgentOpen 
                    ? 'bg-studio-900 text-white border-studio-900 ring-2 ring-studio-200' 
                    : 'bg-white text-studio-700 border-studio-200 hover:border-studio-400'}`}
            >
                <Sparkles size={14} className={isAgentOpen ? 'text-yellow-300' : 'text-studio-500'} />
                <span>AI Designer</span>
            </button>

            <div className="h-4 w-px bg-studio-300/50 mx-1" />

            {/* Canvas Size */}
            <div className="relative">
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-studio-200 text-studio-700 text-xs font-semibold hover:border-studio-400 transition-all active:scale-95"
                >
                    <LayoutTemplate size={14} className="text-studio-500"/>
                    <span>{canvasSize.label}</span>
                    <ChevronDown size={12} className="text-studio-400"/>
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-studio-100 overflow-hidden py-1 z-50"
                        >
                            {SIZES.map(s => (
                                <button
                                    key={s.label}
                                    onClick={() => { setCanvasSize(s.w, s.h, s.label, s.ratio); setIsOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-[11px] font-medium hover:bg-studio-50 flex items-center justify-between ${canvasSize.ratio === s.ratio ? 'text-studio-900 bg-studio-50' : 'text-studio-500'}`}
                                >
                                    {s.label}
                                    {canvasSize.ratio === s.ratio && <div className="w-1.5 h-1.5 rounded-full bg-studio-900"/>}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-1.5 bg-studio-900 text-white rounded-lg shadow hover:bg-black active:scale-95 transition-all text-xs font-bold disabled:opacity-70 disabled:cursor-wait"
            >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Export
            </button>
        </div>
    );
};

export const FooterControls: React.FC<{ onFitToScreen: () => void }> = ({ onFitToScreen }) => {
    const { 
        scale, setScale, pages, activePageIndex, addPage, deletePage, setActivePageIndex 
    } = useAppStore();

    return (
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-4 z-40 pointer-events-none">
            {/* Page Manager */}
            <div className="pointer-events-auto flex flex-col gap-2 items-end">
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto p-2 scrollbar-hide">
                    {pages.map((page, idx) => (
                        <div key={page.id} className="relative group">
                            <button
                                onClick={() => setActivePageIndex(idx)}
                                className={`w-12 h-16 rounded border transition-all flex items-center justify-center text-[10px] font-bold shadow-sm bg-white relative overflow-hidden ${
                                    idx === activePageIndex 
                                        ? 'border-studio-900 text-studio-900' 
                                        : 'border-white text-studio-300 hover:border-studio-200'
                                }`}
                            >
                                <span className="z-10">{idx + 1}</span>
                            </button>
                            {pages.length > 1 && (
                                <button 
                                    onClick={() => deletePage(idx)}
                                    className="absolute -top-1.5 -right-1.5 bg-white text-red-500 border border-studio-200 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110"
                                >
                                    <Trash2 size={10} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <button onClick={addPage} className="w-12 h-8 rounded border border-dashed border-studio-300 bg-white/50 hover:bg-white hover:border-studio-900 hover:text-studio-900 flex items-center justify-center text-studio-400 transition-all">
                    <Plus size={16} />
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="pointer-events-auto flex items-center gap-1 p-1 bg-white rounded-full shadow-float border border-studio-100">
                <button onClick={() => setScale(scale - 0.1)} className="w-8 h-8 flex items-center justify-center hover:bg-studio-50 rounded-full text-studio-600 transition-colors"><Minus size={14} /></button>
                <span className="text-[11px] font-bold w-10 text-center text-studio-800 tabular-nums">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(scale + 0.1)} className="w-8 h-8 flex items-center justify-center hover:bg-studio-50 rounded-full text-studio-600 transition-colors"><Plus size={14} /></button>
                <div className="w-px h-4 bg-studio-200 mx-1" />
                <button onClick={onFitToScreen} className="w-8 h-8 flex items-center justify-center hover:bg-studio-50 text-studio-900 rounded-full transition-colors" title="Fit"><Maximize size={14} /></button>
            </div>
        </div>
    );
};