import { CSSProperties } from 'react';

export type LayerType = 'image' | 'text' | 'shape';

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";
export type WorkflowType = 'home' | 'agent_batch' | 'face_swap' | 'bg_swap' | 'fission' | 'fusion' | 'creative' | 'detail' | 'extraction' | 'planting' | 'layer_management';

// --- Face Swap Specific Types ---
export type FaceSwapMode = 'model_swap' | 'head_swap' | 'face_swap';
export type FaceModelSource = 'preset' | 'fixed' | 'custom';

// --- Background Swap Specific Types ---
export type LightingType = 'soft' | 'natural' | 'studio' | 'cinematic' | 'neon';
export type BlurLevel = 'none' | 'subtle' | 'strong';

export interface AnalysisResult {
  description: string;
  tags?: string[];
}

// --- Masking & AI Action Types ---
export type AIActionType = 'upscale' | 'remove_bg' | 'eraser' | 'inpainting' | 'segmentation' | 'local_redraw';

export interface GenerationConfig {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  referenceImage?: string; // The Product/Body Image (Primary)
  referenceImages?: string[]; // NEW: Multiple images for Fusion (Mannequin angles)
  poseImage?: string;      // Skeleton Image
  faceImage?: string;      // The specific face to swap in
  maskImage?: string;      // NEW: For Eraser/Inpainting mask (Base64)
  workflow: WorkflowType;
  
  // Advanced Configs passed via logic
  faceSwapConfig?: {
    mode: FaceSwapMode;
    source: FaceModelSource;
    similarity: number; // 0-100
  };

  bgSwapConfig?: {
    lighting: LightingType;
    blur: number; // 0-100
    sceneType?: string;
  };
}

// --- Advanced Canvas Types ---

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
export type TextEffectStyle = 'none' | 'shadow' | 'neon' | 'bubble';
export type MaskShape = 'none' | 'circle' | 'rect' | 'star' | 'heart';

export interface FilterState {
  brightness: number; // 100 default
  contrast: number;   // 100 default
  saturate: number;   // 100 default
  blur: number;       // 0 default
  grayscale: number;  // 0 default
}

export interface TextState {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: string;
  color: string;
  align: 'left' | 'center' | 'right';
  strokeColor?: string;
  strokeWidth?: number;
  effect: TextEffectStyle;
  effectColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface CanvasLayer {
  id: string;
  type: LayerType;
  name: string;
  groupId?: string; // NEW: Group ID for merging layers
  
  // Geometry
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX?: number; // For Horizontal Flip (1 or -1)
  scaleY?: number; // For Vertical Flip (1 or -1)
  zIndex: number;
  
  // Content
  src?: string; // For images
  text?: string; // For text
  
  // Appearance
  opacity: number;
  visible: boolean;
  locked: boolean;
  borderRadius: number;
  
  // Advanced Props
  filters?: FilterState;
  textStyle?: TextState;
  mask?: MaskShape;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
}

// --- New Canvas System Types ---

export interface CanvasSize {
  width: number;
  height: number;
  label: string;
  ratio: AspectRatio;
}

export interface Page {
  id: string;
  layers: CanvasLayer[];
  background?: string; // Hex color or image URL
}