
import React, { useState } from 'react';
import { 
  Users, Image as ImageIcon, Layers, Combine, 
  Settings, List,
  Bot, Aperture, Scan, ZoomIn, Sprout, Sun, Moon, Languages
} from 'lucide-react';
import { useAppStore } from '../store';
import { WorkflowType } from '../types';
import { translations, TranslationKey } from '../utils/i18n';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to get translated tool definition
const getTools = (lang: 'zh' | 'en') => {
  const t = translations[lang];
  return [
    { 
        id: 'agent_batch', 
        icon: <Bot size={20} />, 
        label: t['tool.agent_batch.label'],
        desc: t['tool.agent_batch.desc'],
        preview: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=400&h=250&fit=crop'
    },
    { 
        id: 'fission', 
        icon: <Layers size={20} />, 
        label: t['tool.fission.label'],
        desc: t['tool.fission.desc'],
        preview: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=250&fit=crop'
    },
    { 
        id: 'bg_swap', 
        icon: <ImageIcon size={20} />, 
        label: t['tool.bg_swap.label'],
        desc: t['tool.bg_swap.desc'],
        preview: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=250&fit=crop'
    },
    { 
        id: 'face_swap', 
        icon: <Users size={20} />, 
        label: t['tool.face_swap.label'],
        desc: t['tool.face_swap.desc'],
        preview: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=250&fit=crop'
    },
    { 
        id: 'fusion', 
        icon: <Combine size={20} />, 
        label: t['tool.fusion.label'],
        desc: t['tool.fusion.desc'],
        preview: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=250&fit=crop&q=80'
    },
    { 
        id: 'extraction', 
        icon: <Scan size={20} />, 
        label: t['tool.extraction.label'],
        desc: t['tool.extraction.desc'],
        preview: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=250&fit=crop&q=80'
    },
    { 
        id: 'detail', 
        icon: <ZoomIn size={20} />, 
        label: t['tool.detail.label'],
        desc: t['tool.detail.desc'],
        preview: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&h=250&fit=crop&q=80'
    },
    { 
        id: 'planting', 
        icon: <Sprout size={20} />, 
        label: t['tool.planting.label'],
        desc: t['tool.planting.desc'],
        preview: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=250&fit=crop&q=80'
    },
    { 
        id: 'layer_management', 
        icon: <List size={20} />, 
        label: t['tool.layer_management.label'],
        desc: t['tool.layer_management.desc'],
        preview: null
    },
  ];
};

interface TooltipProps {
  item: { label: string; desc: string; preview: string | null };
  top: number;
}

const Tooltip: React.FC<TooltipProps> = ({ item, top }) => (
    <div 
        className="fixed left-20 ml-2 z-[9999] pointer-events-none"
        style={{ top: top, transform: 'translateY(-50%)' }}
    >
        <motion.div 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="bg-zinc-900 border border-zinc-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-xl p-3 w-64 text-left relative"
        >
            {/* Arrow */}
            <div className="absolute top-1/2 -translate-x-1/2 -left-1.5 w-3 h-3 bg-zinc-900 border-l border-b border-zinc-700/50 rotate-45" />
            
            <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-white text-sm tracking-wide">{item.label}</span>
            </div>
            
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-3 border-b border-zinc-800 pb-2">
            {item.desc}
            </p>
            
            {item.preview ? (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 relative group">
                    <img src={item.preview} alt={item.label} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    {/* Overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white/90 font-medium">
                        Preview
                    </div>
                </div>
            ) : (
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">Tool</span>
            </div>
            )}
        </motion.div>
    </div>
);

interface NavItemProps {
  item: { id: string; icon: React.ReactNode };
  active: boolean;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, active, onClick, onMouseEnter, onMouseLeave }) => (
  <button
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    className="relative w-12 h-12 flex items-center justify-center group mb-2 outline-none shrink-0"
  >
    {/* Active Indicator */}
    {active && (
      <motion.div
        layoutId="active-nav"
        className="absolute inset-2 bg-studio-900 dark:bg-white rounded-lg shadow-sm"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}

    {/* Icon */}
    <div className={`relative z-10 transition-colors duration-200 ${active ? 'text-white dark:text-studio-900' : 'text-studio-400 group-hover:text-studio-800 dark:text-studio-500 dark:group-hover:text-studio-300'}`}>
      {item.icon}
    </div>
  </button>
);

export const Sidebar: React.FC = () => {
  const { activeWorkflow, setWorkflow, theme, toggleTheme, language, toggleLanguage } = useAppStore();
  const tools = getTools(language);
  const [hoveredTool, setHoveredTool] = useState<{ item: typeof tools[0], top: number } | null>(null);

  return (
    <>
        <div className="w-20 h-full bg-white dark:bg-studio-900 border-r border-studio-200 dark:border-studio-800 flex flex-col items-center py-6 z-20 shadow-sm relative transition-colors duration-300">
        {/* Brand Logo - Click to go Home */}
        <button 
            onClick={() => setWorkflow('home')}
            className="mb-8 relative group"
            title={translations[language]['ui.back_home']}
        >
            <div className="w-12 h-12 bg-studio-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-studio-900 shadow-xl shadow-studio-900/20 dark:shadow-white/10 transition-all group-hover:scale-105 group-hover:shadow-studio-900/40">
                <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
                    <Aperture size={26} strokeWidth={1.5} />
                </motion.div>
            </div>
        </button>

        <div className="flex-1 flex flex-col items-center w-full scrollbar-hide overflow-y-auto overflow-x-hidden">
            {tools.map((item) => (
            <NavItem
                key={item.id}
                item={item}
                active={activeWorkflow === item.id}
                onClick={() => setWorkflow(item.id as WorkflowType)}
                onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredTool({ item, top: rect.top + rect.height / 2 });
                }}
                onMouseLeave={() => setHoveredTool(null)}
            />
            ))}
        </div>

        <div className="mt-auto pt-4 border-t border-studio-100 dark:border-studio-800 w-full flex flex-col items-center gap-3 shrink-0">
            {/* Language Toggle */}
            <button 
                onClick={toggleLanguage}
                className="w-10 h-10 flex flex-col items-center justify-center text-studio-400 dark:text-studio-500 hover:text-studio-900 dark:hover:text-studio-100 hover:bg-studio-50 dark:hover:bg-studio-800 rounded-lg transition-colors group"
                title={translations[language]['ui.lang_toggle']}
            >
                <Languages size={20} className="mb-0.5" />
                <span className="text-[9px] font-bold">{language === 'zh' ? '中' : 'EN'}</span>
            </button>

            {/* Theme Toggle Button */}
            <button 
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center text-studio-400 dark:text-studio-500 hover:text-studio-900 dark:hover:text-studio-100 hover:bg-studio-50 dark:hover:bg-studio-800 rounded-lg transition-colors"
                title={translations[language]['ui.theme_toggle']}
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <button className="w-10 h-10 flex items-center justify-center text-studio-400 dark:text-studio-500 hover:text-studio-900 dark:hover:text-studio-100 hover:bg-studio-50 dark:hover:bg-studio-800 rounded-lg transition-colors">
            <Settings size={20} />
            </button>
        </div>
        </div>

        {/* Render Tooltip via Portal Strategy (Fixed Position) */}
        <AnimatePresence>
            {hoveredTool && (
                <Tooltip item={hoveredTool.item} top={hoveredTool.top} />
            )}
        </AnimatePresence>
    </>
  );
};
