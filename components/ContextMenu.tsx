
import React, { useEffect, useRef } from 'react';
import { 
  Copy, Trash2, Lock, Unlock, 
  BringToFront, SendToBack, ArrowUp, ArrowDown,
  EyeOff, Group, Ungroup
} from 'lucide-react';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { 
    selectedLayerIds, getLayers, 
    duplicateLayer, removeSelectedLayers, toggleLayerLock, toggleLayerVisibility,
    moveLayer, groupSelectedLayers, ungroupSelectedLayers
  } = useAppStore();

  const layers = getLayers();
  const selectedCount = selectedLayerIds.length;
  const primaryId = selectedLayerIds[selectedCount - 1];
  const primaryLayer = layers.find(l => l.id === primaryId);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!primaryLayer && selectedCount === 0) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[9999] min-w-[200px] bg-white dark:bg-studio-900 border border-studio-200 dark:border-studio-700 rounded-lg shadow-xl py-1.5 flex flex-col text-sm"
        style={{ left: x, top: y }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="px-3 py-1.5 text-xs font-semibold text-studio-400 dark:text-studio-500 border-b border-studio-100 dark:border-studio-800 mb-1">
          {selectedCount > 1 ? `已选中 ${selectedCount} 个图层` : primaryLayer?.name || '图层操作'}
        </div>

        <MenuItem 
            icon={Copy} label="复制图层 (Duplicate)" shortcut="Ctrl+D"
            onClick={() => handleAction(() => selectedLayerIds.forEach(id => duplicateLayer(id)))} 
        />
        
        {selectedCount > 1 ? (
             <MenuItem icon={Group} label="合并组 (Group)" shortcut="Ctrl+G" onClick={() => handleAction(groupSelectedLayers)} />
        ) : (
             primaryLayer?.groupId && <MenuItem icon={Ungroup} label="解散组 (Ungroup)" shortcut="Ctrl+Shift+G" onClick={() => handleAction(ungroupSelectedLayers)} />
        )}

        <div className="my-1 h-px bg-studio-100 dark:bg-studio-800" />
        
        <MenuItem 
            icon={primaryLayer?.locked ? Unlock : Lock} 
            label={primaryLayer?.locked ? "解锁 (Unlock)" : "锁定 (Lock)"} 
            shortcut="Ctrl+L"
            onClick={() => handleAction(() => selectedLayerIds.forEach(id => toggleLayerLock(id)))} 
        />
        
        <MenuItem icon={EyeOff} label="隐藏 (Hide)" onClick={() => handleAction(() => selectedLayerIds.forEach(id => toggleLayerVisibility(id)))} />

        <div className="my-1 h-px bg-studio-100 dark:bg-studio-800" />
        
        <MenuItem icon={BringToFront} label="置顶 (Bring Front)" onClick={() => handleAction(() => moveLayer(primaryId, 'top'))} />
        <MenuItem icon={ArrowUp} label="上移一层 (Up)" onClick={() => handleAction(() => moveLayer(primaryId, 'up'))} />
        <MenuItem icon={ArrowDown} label="下移一层 (Down)" onClick={() => handleAction(() => moveLayer(primaryId, 'down'))} />
        <MenuItem icon={SendToBack} label="置底 (Send Back)" onClick={() => handleAction(() => moveLayer(primaryId, 'bottom'))} />
        
        <div className="my-1 h-px bg-studio-100 dark:bg-studio-800" />
        
        <MenuItem 
            icon={Trash2} label="删除 (Delete)" shortcut="Del" color="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => handleAction(removeSelectedLayers)} 
        />

      </motion.div>
    </AnimatePresence>
  );
};

const MenuItem = ({ icon: Icon, label, shortcut, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className={`w-full text-left px-3 py-1.5 flex items-center gap-2.5 hover:bg-studio-100 dark:hover:bg-studio-800 transition-colors ${color || 'text-studio-700 dark:text-studio-200'}`}
  >
    <Icon size={14} />
    <span className="flex-1">{label}</span>
    {shortcut && <span className="text-[10px] text-studio-400 font-mono tracking-wider">{shortcut}</span>}
  </button>
);
