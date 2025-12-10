
import { create } from 'zustand';
import { CanvasLayer, WorkflowType, GuideLine, Page, CanvasSize, AspectRatio, AIActionType } from './types';
import { generateId } from './utils/helpers';

interface HistoryState {
  past: Page[][]; // Snapshot of all pages
  future: Page[][];
}

interface AppState {
  // Navigation
  activeWorkflow: WorkflowType;
  setWorkflow: (wf: WorkflowType) => void;
  
  // Theme & Language
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: 'zh' | 'en';
  toggleLanguage: () => void;

  // View State (Zoom & Canvas)
  scale: number;
  setScale: (val: number) => void;
  canvasSize: CanvasSize;
  setCanvasSize: (width: number, height: number, label: string, ratio: AspectRatio) => void;

  // Pagination & Layers
  pages: Page[];
  activePageIndex: number;
  
  // Computed helpers for easy access
  getLayers: () => CanvasLayer[];
  
  // Selection
  selectedLayerIds: string[]; // Array of IDs
  guidelines: GuideLine[];
  showSafeArea: boolean;
  
  // History
  history: HistoryState;
  
  // Actions (Page Level)
  addPage: () => void;
  deletePage: (index: number) => void;
  setActivePageIndex: (index: number) => void;

  // Actions (Layer Level - Applies to Active Page)
  addLayer: (layer: Partial<CanvasLayer>) => void;
  updateLayer: (id: string, updates: Partial<CanvasLayer>, recordHistory?: boolean) => void;
  selectLayer: (id: string | null) => void; // Helper for single select (handles group expansion)
  selectLayers: (ids: string[]) => void; // Multi select (handles group expansion)
  removeLayer: (id: string) => void;
  removeSelectedLayers: () => void;
  duplicateLayer: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  toggleLayerLock: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  
  // Grouping Actions
  groupSelectedLayers: () => void;
  ungroupSelectedLayers: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  recordHistory: () => void; 

  // Helpers
  setGuidelines: (guides: GuideLine[]) => void;
  setShowSafeArea: (show: boolean) => void;
  
  // App State
  isGenerating: boolean;
  setIsGenerating: (is: boolean) => void;
  apiKeyMissing: boolean;
  setApiKeyMissing: (missing: boolean) => void;
  
  // Design Agent State
  isAgentOpen: boolean;
  toggleAgent: () => void;

  // --- Masking / AI Editing State ---
  maskingLayerId: string | null;
  maskingAction: AIActionType | null;
  setMaskingMode: (layerId: string | null, action: AIActionType | null) => void;
  
  // Callback registry to retrieve mask from the UI component
  maskExportFn: (() => string | null) | null;
  setMaskExportFn: (fn: (() => string | null) | null) => void;
}

const DEFAULT_CANVAS: CanvasSize = { width: 1080, height: 1440, label: '3:4 (Portrait)', ratio: '3:4' };

export const useAppStore = create<AppState>((set, get) => ({
  // CHANGE: Default to 'home' for Landing Page experience
  activeWorkflow: 'home',
  setWorkflow: (wf) => set({ activeWorkflow: wf }),
  
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  language: 'en',
  toggleLanguage: () => set((state) => ({ language: state.language === 'zh' ? 'en' : 'zh' })),

  // View State
  scale: 0.9,
  setScale: (val) => set({ scale: Math.min(Math.max(0.1, val), 5) }), // Limit zoom 10% - 500%
  canvasSize: DEFAULT_CANVAS,
  setCanvasSize: (width, height, label, ratio) => set({ canvasSize: { width, height, label, ratio } }),

  // Pages
  pages: [{ id: 'page-1', layers: [] }],
  activePageIndex: 0,
  
  getLayers: () => {
    const { pages, activePageIndex } = get();
    return pages[activePageIndex]?.layers || [];
  },

  selectedLayerIds: [],
  guidelines: [],
  showSafeArea: false,
  history: { past: [], future: [] },

  setGuidelines: (guides) => set({ guidelines: guides }),
  setShowSafeArea: (show) => set({ showSafeArea: show }),

  // --- Page Actions ---
  addPage: () => {
    get().recordHistory();
    set((state) => ({
      pages: [...state.pages, { id: generateId(), layers: [] }],
      activePageIndex: state.pages.length // Switch to new page
    }));
  },

  deletePage: (index) => {
    get().recordHistory();
    set((state) => {
      if (state.pages.length <= 1) return state; // Prevent deleting last page
      const newPages = state.pages.filter((_, i) => i !== index);
      // Adjust active index if needed
      const newIndex = index === state.activePageIndex 
        ? Math.max(0, index - 1) 
        : (index < state.activePageIndex ? state.activePageIndex - 1 : state.activePageIndex);
      
      return { pages: newPages, activePageIndex: newIndex };
    });
  },

  setActivePageIndex: (index) => set({ activePageIndex: index, selectedLayerIds: [] }),

  // --- History Logic ---
  recordHistory: () => {
    const { pages, history } = get();
    const lastState = history.past[history.past.length - 1];
    // Simple deep compare check to avoid spam
    if (JSON.stringify(lastState) === JSON.stringify(pages)) return;

    set({
      history: {
        past: [...history.past, pages],
        future: [] 
      }
    });
  },

  undo: () => set((state) => {
    const { past, future } = state.history;
    if (past.length === 0) return state;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    return {
      pages: previous, // Restore all pages state
      history: {
        past: newPast,
        future: [state.pages, ...future]
      }
    };
  }),

  redo: () => set((state) => {
    const { past, future } = state.history;
    if (future.length === 0) return state;

    const next = future[0];
    const newFuture = future.slice(1);

    return {
      pages: next,
      history: {
        past: [...past, state.pages],
        future: newFuture
      }
    };
  }),

  // --- Layer Actions (Scoped to Active Page) ---
  addLayer: (layer) => {
    get().recordHistory();
    const { canvasSize } = get();
    
    // Default position center
    const defaultX = canvasSize.width / 2 - (layer.width || 300) / 2;
    const defaultY = canvasSize.height / 2 - (layer.height || 300) / 2;

    const newLayer: CanvasLayer = {
      id: generateId(),
      type: 'image',
      name: `Layer`,
      x: defaultX,
      y: defaultY,
      width: 300,
      height: 300,
      rotation: 0,
      scaleX: 1, // Default scale
      scaleY: 1,
      zIndex: 1, // Will be fixed by length
      opacity: 1,
      visible: true,
      locked: false,
      borderRadius: 0,
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, grayscale: 0 },
      ...layer,
      // Ensure textStyle defaults are set if it's a text layer
      textStyle: layer.type === 'text' ? {
          fontSize: 60,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: '#18181b',
          align: 'center',
          effect: 'none',
          lineHeight: 1.2,
          letterSpacing: 0,
          ...layer.textStyle
      } : undefined
    } as CanvasLayer;

    set((state) => {
      const activePage = state.pages[state.activePageIndex];
      newLayer.zIndex = activePage.layers.length + 1;
      newLayer.name = layer.name || `${layer.type === 'text' ? 'Text' : 'Layer'} ${activePage.layers.length + 1}`;
      
      const newPages = [...state.pages];
      newPages[state.activePageIndex] = {
        ...activePage,
        layers: [...activePage.layers, newLayer]
      };

      return {
        pages: newPages,
        selectedLayerIds: [newLayer.id]
      };
    });
  },

  updateLayer: (id, updates, saveHistory = false) => {
    if (saveHistory) get().recordHistory();
    set((state) => {
      const newPages = [...state.pages];
      const activePage = newPages[state.activePageIndex];
      
      activePage.layers = activePage.layers.map(l => 
        l.id === id ? { ...l, ...updates } : l
      );

      return { pages: newPages };
    });
  },

  // Select Layer - Enhanced to handle Group Selection
  selectLayer: (id) => {
    if (!id) {
        set({ selectedLayerIds: [] });
        return;
    }
    const { pages, activePageIndex } = get();
    const activePage = pages[activePageIndex];
    const target = activePage.layers.find(l => l.id === id);
    
    if (target && target.groupId) {
        // Select all layers in the same group
        const groupIds = activePage.layers
            .filter(l => l.groupId === target.groupId)
            .map(l => l.id);
        set({ selectedLayerIds: groupIds });
    } else {
        set({ selectedLayerIds: [id] });
    }
  },

  // Select Multiple Layers - Enhanced to handle Group Integrity
  selectLayers: (ids) => {
    const { pages, activePageIndex } = get();
    const layers = pages[activePageIndex].layers;
    const finalIds = new Set<string>();

    ids.forEach(id => {
        const layer = layers.find(l => l.id === id);
        if (layer) {
            if (layer.groupId) {
                // If part of a group, add all group members
                layers.filter(g => g.groupId === layer.groupId).forEach(g => finalIds.add(g.id));
            } else {
                finalIds.add(id);
            }
        }
    });

    set({ selectedLayerIds: Array.from(finalIds) });
  },
  
  removeLayer: (id) => {
    get().recordHistory();
    set((state) => {
      const newPages = [...state.pages];
      const activePage = newPages[state.activePageIndex];
      activePage.layers = activePage.layers.filter(l => l.id !== id);
      
      return { 
        pages: newPages,
        selectedLayerIds: state.selectedLayerIds.filter(selId => selId !== id)
      };
    });
  },

  removeSelectedLayers: () => {
    const { selectedLayerIds } = get();
    if (selectedLayerIds.length === 0) return;
    
    get().recordHistory();
    set((state) => {
        const newPages = [...state.pages];
        const activePage = newPages[state.activePageIndex];
        activePage.layers = activePage.layers.filter(l => !state.selectedLayerIds.includes(l.id));
        return {
            pages: newPages,
            selectedLayerIds: []
        };
    });
  },

  duplicateLayer: (id) => {
    get().recordHistory();
    set((state) => {
      const newPages = [...state.pages];
      const activePage = newPages[state.activePageIndex];
      const layerToCopy = activePage.layers.find(l => l.id === id);
      
      if (!layerToCopy) return state;
      
      const newLayer = {
        ...layerToCopy,
        id: generateId(),
        x: layerToCopy.x + 20,
        y: layerToCopy.y + 20,
        name: `${layerToCopy.name} (Copy)`,
        zIndex: activePage.layers.length + 1,
        groupId: undefined // Do not copy group ID, new copy is independent
      };
      
      activePage.layers = [...activePage.layers, newLayer];
      
      return {
        pages: newPages,
        selectedLayerIds: [newLayer.id]
      };
    });
  },

  moveLayer: (id, direction) => {
    get().recordHistory();
    set((state) => {
      const newPages = [...state.pages];
      const activePage = newPages[state.activePageIndex];
      const index = activePage.layers.findIndex(l => l.id === id);
      if (index === -1) return state;
      
      const layer = activePage.layers[index];
      const newLayers = [...activePage.layers];
      newLayers.splice(index, 1);
      
      if (direction === 'top') {
        newLayers.push(layer);
      } else if (direction === 'bottom') {
        newLayers.unshift(layer);
      } else if (direction === 'up') {
        const newIndex = Math.min(newLayers.length, index + 1);
        newLayers.splice(newIndex, 0, layer);
      } else if (direction === 'down') {
        const newIndex = Math.max(0, index - 1);
        newLayers.splice(newIndex, 0, layer);
      }
      
      // Re-normalize zIndexes
      activePage.layers = newLayers.map((l, idx) => ({ ...l, zIndex: idx + 1 }));
      
      return { pages: newPages };
    });
  },

  toggleLayerLock: (id) => set((state) => {
     const newPages = [...state.pages];
     const activePage = newPages[state.activePageIndex];
     activePage.layers = activePage.layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l);
     return { 
        pages: newPages,
     };
  }),

  toggleLayerVisibility: (id) => set((state) => {
     const newPages = [...state.pages];
     const activePage = newPages[state.activePageIndex];
     activePage.layers = activePage.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
     return { pages: newPages };
  }),

  // --- Grouping Actions ---
  groupSelectedLayers: () => {
      const { selectedLayerIds, pages, activePageIndex } = get();
      if (selectedLayerIds.length <= 1) return;

      get().recordHistory();
      const newGroupId = generateId();

      set(state => {
          const newPages = [...state.pages];
          const page = newPages[activePageIndex];
          page.layers = page.layers.map(l => 
              selectedLayerIds.includes(l.id) ? { ...l, groupId: newGroupId } : l
          );
          return { pages: newPages };
      });
  },

  ungroupSelectedLayers: () => {
      const { selectedLayerIds, pages, activePageIndex } = get();
      if (selectedLayerIds.length === 0) return;

      get().recordHistory();
      set(state => {
          const newPages = [...state.pages];
          const page = newPages[activePageIndex];
          
          // Identify groups involved in selection
          const groupsToBreak = new Set(
              page.layers
                  .filter(l => selectedLayerIds.includes(l.id) && l.groupId)
                  .map(l => l.groupId)
          );

          if (groupsToBreak.size === 0) return {};

          // Remove groupId from ALL layers belonging to those groups
          page.layers = page.layers.map(l => 
              (l.groupId && groupsToBreak.has(l.groupId)) ? { ...l, groupId: undefined } : l
          );
          return { pages: newPages };
      });
  },

  isGenerating: false,
  setIsGenerating: (is) => set({ isGenerating: is }),

  apiKeyMissing: false,
  setApiKeyMissing: (missing) => set({ apiKeyMissing: missing }),
  
  isAgentOpen: false,
  toggleAgent: () => set((state) => ({ isAgentOpen: !state.isAgentOpen })),

  // --- Masking ---
  maskingLayerId: null,
  maskingAction: null,
  setMaskingMode: (layerId, action) => set({ maskingLayerId: layerId, maskingAction: action }),

  maskExportFn: null,
  setMaskExportFn: (fn) => set({ maskExportFn: fn }),
}));
