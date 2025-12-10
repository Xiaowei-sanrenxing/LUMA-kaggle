


import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { generateImage, analyzeImage, enhancePrompt } from '../services/geminiService';
import { AspectRatio, ImageSize, WorkflowType, FaceSwapMode, FaceModelSource, LightingType } from '../types';
import { calculateLayerSize } from '../utils/helpers';
import { translations, TranslationKey } from '../utils/i18n';
import { 
  Loader2, Upload, Wand2, Info, Check, User, Activity, Sparkles,
  CheckCircle2, Eye, EyeOff, Lock, Unlock, Trash2, ArrowUp, ArrowDown,
  Layers, Lightbulb, Plus, Image as ImageIcon,
  Smile, Frown, Meh, ScanFace, ShoppingBag, Hash, Maximize, ChevronDown,
  UserCheck, UserCog, UserPlus, Sun, Moon, Lamp, Aperture, Palette,
  // New Icons for Advanced Scenes
  Castle, Flame, Church, Flower2, // Classical
  Trees, Grape, Waves, Leaf, Cloud, Mountain, // Natural
  Building2, Box, GalleryVerticalEnd, Hotel, Hexagon, Triangle, Circle, // Modern
  Library, Armchair, Hourglass, Coffee, Music, // Vintage
  Camera, Gift, Snowflake, Ghost, Heart, Star, Tent, Anchor, Feather, Droplets,
  Sofa, Table2, Home, Fan, Crown, Gem, Umbrella, Palmtree,
  // New Icons for Poses
  Focus, Scan, Move, Footprints, Zap, Train, AlignRight,
  // New Icons for Fusion
  Shirt, Scissors, ZoomIn, Accessibility, MonitorPlay, Wand,
  X,
  Bot, // Bot for Agent
  BoxSelect, ScanLine, Tag, Sprout, // Import Sprout
  Users // Import Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helper Functions for Image Sizing ---

const loadImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      // Fallback if image fails to load, prevent hanging
      resolve({ width: 1024, height: 1024 });
    };
    img.src = src;
  });
};

// 平台预设数据
const PLATFORMS = [
  { id: 'amazon', label: 'Amazon (1:1)', ratio: '1:1' as AspectRatio },
  { id: 'shein', label: 'Shein (3:4)', ratio: '3:4' as AspectRatio },
  { id: 'temu', label: 'Temu (3:4)', ratio: '3:4' as AspectRatio },
  { id: 'ebay', label: 'eBay (1:1)', ratio: '1:1' as AspectRatio },
  { id: 'aliexpress', label: 'AliExpress (1:1)', ratio: '1:1' as AspectRatio },
  { id: 'tiktok', label: 'TikTok (9:16)', ratio: '9:16' as AspectRatio },
  { id: 'redbook', label: 'Redbook (3:4)', ratio: '3:4' as AspectRatio },
];

const QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 预设模特库
const PRESET_MODELS = [
  { id: 'asia_1', label: 'Asia 1', src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80', desc: 'Asian female, soft features, elegant smile' },
  { id: 'asia_2', label: 'Asia 2', src: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&q=80', desc: 'Asian female, high fashion, sharp features' },
  { id: 'eu_1', label: 'Euro 1', src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&q=80', desc: 'Caucasian female, blonde, classic beauty' },
  { id: 'eu_2', label: 'Euro 2', src: 'https://images.unsplash.com/photo-1503104834685-7205e8607eb9?w=200&h=200&fit=crop&q=80', desc: 'Caucasian female, edgy, street style, cool attitude' },
  { id: 'af_1', label: 'Africa 1', src: 'https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=200&h=200&fit=crop&q=80', desc: 'African female, elegant, glowing skin' },
  { id: 'la_1', label: 'Latina 1', src: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&q=80', desc: 'Latina female, energetic, curly hair' },
];

// 固定模特（模拟品牌资产）
const FIXED_MODELS = [
    { id: 'brand_lily', label: 'Lily (Brand)', src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80' },
    { id: 'brand_coco', label: 'Coco (Brand)', src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&q=80' },
];

// --- PROFESSIONAL SCENE CONFIGURATION (UPDATED) ---

const SCENE_CATEGORIES = [
    { id: 'studio', label: 'Studio', icon: Camera }, // New
    { id: 'indoor_ceremony', label: 'Indoor', icon: Church }, // New
    { id: 'outdoor_ceremony', label: 'Outdoor', icon: Tent }, // New
    { id: 'holidays', label: 'Holiday', icon: Gift }, // New
    { id: 'classical', label: 'Classic', icon: Castle },
    { id: 'natural', label: 'Natural', icon: Leaf },
    { id: 'modern', label: 'Modern', icon: Building2 },
    { id: 'vintage', label: 'Vintage', icon: Hourglass },
];

const SCENE_PRESETS: Record<string, {id: string, label: string, icon: any, color: string, prompt: string, desc: string}[]> = {
    'studio': [
        { id: 'white_cyc', label: 'White Cyc', icon: Box, color: '#F9FAFB', desc: 'High-key/E-comm', prompt: 'Professional photography studio, pure white infinity cyclorama, shadowless high-key lighting, 8k resolution, crisp details.' },
        { id: 'grey_master', label: 'Grey Studio', icon: Box, color: '#F3F4F6', desc: 'Texture/Muted', prompt: 'Studio shot, medium grey seamless background paper, soft artistic shadows, muted tones, high-end fashion catalog style.' },
        { id: 'spotlight', label: 'Spotlight', icon: Lamp, color: '#18181b', desc: 'Dramatic', prompt: 'Dark studio background, single dramatic spotlight on subject, deep shadows, cinematic contrast, luxury product reveal.' },
        { id: 'colored_gel', label: 'Color Gel', icon: Palette, color: '#FCE7F3', desc: 'Cyberpunk/Neon', prompt: 'Studio photography with creative colored gel lighting (blue and pink rim lights), cyberpunk aesthetic, modern fashion vibe.' },
        { id: 'geometric', label: 'Geometric', icon: Hexagon, color: '#E0E7FF', desc: 'Abstract/Shapes', prompt: 'Studio setting with white abstract geometric podiums and shapes, architectural composition, soft shadows, minimalist design.' },
        { id: 'fabric_flow', label: 'Silk Flow', icon: Waves, color: '#FEF2F2', desc: 'Elegant/Soft', prompt: 'Background of flowing silk fabric, elegant drapes, soft texture, pearl white color, gentle movement, luxury aesthetic.' },
        { id: 'botanical_shadow', label: 'Plant Shadow', icon: Leaf, color: '#ECFCCB', desc: 'Natural/Sun', prompt: 'Clean wall background with distinct shadows of palm leaves or tropical plants, dappled sunlight effect, summer vibe.' },
        { id: 'concrete', label: 'Concrete', icon: Box, color: '#E5E5E5', desc: 'Industrial', prompt: 'Raw concrete wall background, industrial loft style, textured grey surface, soft window light, edgy fashion.' },
        { id: 'reflection', label: 'Reflection', icon: Droplets, color: '#E0F2FE', desc: 'Glossy', prompt: 'Product on a black reflective glass surface, horizon line, glossy reflection, premium cosmetic photography style.' },
        { id: 'metal_texture', label: 'Metal', icon: Box, color: '#D4D4D8', desc: 'Tech/Cool', prompt: 'Brushed metal background, silver steel texture, cool tone lighting, sharp and futuristic tech aesthetic.' },
    ],
    // ... (Other categories remain same for brevity, assuming they are defined as in previous file)
    'indoor_ceremony': [
        { id: 'grand_ballroom', label: 'Ballroom', icon: Crown, color: '#FEF3C7', desc: 'Luxury/Gold', prompt: 'Grand wedding ballroom, crystal chandeliers, gold leaf details, high ceilings, opulent atmosphere, wide angle.' },
        { id: 'candle_aisle', label: 'Candle Aisle', icon: Flame, color: '#FFF7ED', desc: 'Romantic', prompt: 'Wedding aisle lined with hundreds of lit candles, warm glow, rose petals on floor, romantic evening ceremony.' },
        { id: 'flower_wall', label: 'Flower Wall', icon: Flower2, color: '#FCE7F3', desc: 'Floral', prompt: 'Massive floral wall background, dense white and pink roses, hydrangeas, luxury wedding backdrop, soft lighting.' },
        { id: 'mirror_room', label: 'Mirror Hall', icon: Box, color: '#E0F2FE', desc: 'Versailles', prompt: 'Hall of Mirrors style room, antique mirrors, gold frames, reflecting light, aristocratic french style.' },
        { id: 'spiral_stairs', label: 'Spiral Stair', icon: Activity, color: '#F3F4F6', desc: 'Architectural', prompt: 'Grand white marble spiral staircase, elegant railing, architectural curve, bridal portrait setting.' },
        { id: 'curtain_drape', label: 'Velvet Curtain', icon: Waves, color: '#7F1D1D', desc: 'Theatrical', prompt: 'Heavy red velvet curtains background, theatrical lighting, dramatic and moody, vintage luxury texture.' },
        { id: 'church_altar', label: 'Altar', icon: Church, color: '#F3E8FF', desc: 'Holy', prompt: 'Close up view of a church altar, stained glass window background, holy cross, religious ceremony atmosphere.' },
        { id: 'banquet_table', label: 'Banquet', icon: Table2, color: '#FFFBEB', desc: 'Dinner', prompt: 'Luxury wedding banquet table setting, fine china, crystal glasses, floral centerpieces, bokeh background.' },
        { id: 'white_arch', label: 'White Arch', icon: Circle, color: '#F9FAFB', desc: 'Minimal', prompt: 'Minimalist white arch structures, indoor gallery space, clean lines, contemporary wedding ceremony.' },
        { id: 'window_light', label: 'Window', icon: Box, color: '#F0F9FF', desc: 'Backlight', prompt: 'Floor-to-ceiling french windows, sheer curtains, soft backlight, silhouette effect, dreamy and airy.' },
    ],
    'outdoor_ceremony': [
        { id: 'forest_chapel', label: 'Forest', icon: Trees, color: '#DCFCE7', desc: 'Pine/Nature', prompt: 'Wedding ceremony set deep in a pine forest, wooden benches, ferns, soft filtered sunlight, twilight saga vibe.' },
        { id: 'beach_altar', label: 'Beach', icon: Waves, color: '#E0F2FE', desc: 'Tropical', prompt: 'Tropical beach wedding altar, bamboo structure, white flowing fabric, turquoise ocean background, blue sky, bright sunlight.' },
        { id: 'garden_gazebo', label: 'Gazebo', icon: Home, color: '#ECFCCB', desc: 'English Garden', prompt: 'White wooden gazebo in a blooming english garden, surrounded by flowers, green lawn, sunny afternoon.' },
        { id: 'cliff_edge', label: 'Cliff', icon: Mountain, color: '#E5E7EB', desc: 'Epic', prompt: 'Ceremony setup on the edge of a cliff, epic panoramic view of the ocean/canyon, dramatic clouds, wind blowing.' },
        { id: 'lakeside', label: 'Lakeside', icon: Droplets, color: '#DBEAFE', desc: 'Serene', prompt: 'Wooden dock on a calm lake, wedding arch at the end, reflection in water, misty morning, serene atmosphere.' },
        { id: 'rooftop', label: 'Rooftop', icon: Building2, color: '#F3F4F6', desc: 'Urban', prompt: 'New York City rooftop wedding, skyline background, sunset colors, urban chic, string lights.' },
        { id: 'vineyard_arch', label: 'Vineyard', icon: Grape, color: '#FEF3C7', desc: 'Tuscany', prompt: 'Wedding arch in the middle of vineyard rows, grapes, tuscany hills background, golden hour light.' },
        { id: 'snow_wedding', label: 'Snow', icon: Snowflake, color: '#F9FAFB', desc: 'Winter', prompt: 'Winter wedding ceremony in snow, faux fur decor, white branches, soft falling snow, magical Narnia vibe.' },
        { id: 'desert_boho', label: 'Desert', icon: Sun, color: '#FFEDD5', desc: 'Boho', prompt: 'Desert landscape, dried pampas grass decor, boho rug aisle, warm terracotta tones, sunset.' },
        { id: 'castle_lawn', label: 'Castle Lawn', icon: Castle, color: '#E0E7FF', desc: 'Royal', prompt: 'Manicured lawn in front of a majestic european castle, fairy tale wedding setup, grand architecture.' },
    ],
    'holidays': [
        { id: 'xmas_tree', label: 'Xmas Tree', icon: Gift, color: '#DC2626', desc: 'Red/Gold', prompt: 'Luxury living room with huge decorated Christmas tree, pile of gifts, red and gold color palette, cozy holiday vibe.' },
        { id: 'xmas_fireplace', label: 'Fireplace', icon: Flame, color: '#7F1D1D', desc: 'Cozy', prompt: 'Close up of decorated fireplace mantle, stockings, garland, warm fire glow, cozy winter evening.' },
        { id: 'halloween_pumpkin', label: 'Pumpkin', icon: Ghost, color: '#EA580C', desc: 'Autumn', prompt: 'Autumn outdoor scene with pile of pumpkins, hay bales, fall leaves, warm orange tones, halloween harvest vibe.' },
        { id: 'halloween_gothic', label: 'Gothic', icon: Castle, color: '#312E81', desc: 'Dark', prompt: 'Dark gothic castle interior, cobwebs, candelabras, moonlight through window, vampire chic aesthetic.' },
        { id: 'valentine_rose', label: 'Roses', icon: Heart, color: '#BE123C', desc: 'Romantic', prompt: 'Room filled with thousands of red and pink balloons and roses, romantic surprise, luxury date night.' },
        { id: 'easter_pastel', label: 'Easter', icon: Star, color: '#F0FDFA', desc: 'Pastel', prompt: 'Pastel colored spring garden, easter eggs, bunnies, tulips, soft airy light, sweet and cute style.' },
        { id: 'thanksgiving', label: 'Thanksgiving', icon: Table2, color: '#78350F', desc: 'Feast', prompt: 'Rich thanksgiving dinner table setting, roasted turkey, autumn decor, candle light, warm family atmosphere.' },
        { id: 'new_year', label: 'New Year', icon: Sparkles, color: '#FBBF24', desc: 'Party', prompt: 'New Year Eve party background, gold glitter, confetti, bokeh lights, champagne glasses, celebration.' },
        { id: 'summer_pool', label: 'Pool', icon: Umbrella, color: '#0EA5E9', desc: 'Vacation', prompt: 'Luxury swimming pool side, inflatable floats, cocktails, bright summer sun, palm tree shadows, vacation vibe.' },
        { id: 'spring_festival', label: 'Spring Fest', icon: Activity, color: '#991B1B', desc: 'Red', prompt: 'Chinese New Year decoration, red lanterns, paper cuttings, plum blossoms, gold accents, festive oriental style.' },
    ],
    'classical': [
        { id: 'manor_court', label: 'Manor', icon: Castle, color: '#E0E7FF', desc: 'Stone', prompt: 'French château courtyard, cobblestone, limestone architecture, fountain, soft daylight, aristocratic.' },
        { id: 'palace_hall', label: 'Palace', icon: Crown, color: '#FEF3C7', desc: 'Opulent', prompt: 'Interior of Versailles palace hall, gold moldings, painted ceiling, opulent luxury, wide angle.' },
        { id: 'library_classic', label: 'Library', icon: Library, color: '#78350F', desc: 'Wood', prompt: 'Classic study room, mahogany wood paneling, leather chair, globe, moody lighting, old money aesthetic.' },
        { id: 'museum_sculpture', label: 'Museum', icon: GalleryVerticalEnd, color: '#F3F4F6', desc: 'Art', prompt: 'Museum hall with marble sculptures, high ceiling, natural skylight, quiet and artistic atmosphere.' },
        { id: 'opera_box', label: 'Opera', icon: Music, color: '#9F1239', desc: 'Velvet', prompt: 'View from an opera house balcony, red velvet seats, gold railing, stage in distance, dramatic lighting.' },
        { id: 'greenhouse_vic', label: 'Greenhouse', icon: Flower2, color: '#ECFCCB', desc: 'Glass', prompt: 'Victorian glasshouse interior, exotic ferns, iron structure, misty humid atmosphere, botanical garden.' },
        { id: 'stone_balcony', label: 'Balcony', icon: Castle, color: '#E5E7EB', desc: 'View', prompt: 'Old stone balcony overlooking a historic city or landscape, sunset light, romeo and juliet vibe.' },
        { id: 'fountain_sq', label: 'Fountain', icon: Droplets, color: '#DBEAFE', desc: 'Water', prompt: 'European city square with large water fountain, splashing water, pigeons, historic buildings background.' },
        { id: 'painting_room', label: 'Atelier', icon: Palette, color: '#FFF7ED', desc: 'Artistic', prompt: 'Artist atelier, easel with canvas, paint tubes, messy but artistic, north window light.' },
        { id: 'harp_room', label: 'Music Room', icon: Music, color: '#FDF2F8', desc: 'Elegant', prompt: 'Elegant music room with a golden harp, window light, sheer curtains, classical sophistication.' },
    ],
    'natural': [
        { id: 'lawn_english', label: 'Lawn', icon: Trees, color: '#DCFCE7', desc: 'Green', prompt: 'Manicured English garden lawn, vibrant green grass, hedge walls, soft sunlight.' },
        { id: 'wild_meadow', label: 'Meadow', icon: Flower2, color: '#FEF9C3', desc: 'Flowers', prompt: 'Wildflower meadow, tall grass, poppies and daisies, breeze blowing, golden hour backlight.' },
        { id: 'wheat_field', label: 'Wheat', icon: Leaf, color: '#FEF3C7', desc: 'Golden', prompt: 'Endless golden wheat field, harvest season, warm sunset glow, rustic and organic.' },
        { id: 'bamboo_forest', label: 'Bamboo', icon: Trees, color: '#D1FAE5', desc: 'Zen', prompt: 'Dense bamboo forest, vertical lines, filtered green light, zen atmosphere, misty path.' },
        { id: 'mountain_lake', label: 'Lake', icon: Mountain, color: '#E0F2FE', desc: 'Clear', prompt: 'Alpine lake with crystal clear water, mountain peaks in background, reflection, crisp air.' },
        { id: 'cherry_blossom', label: 'Sakura', icon: Flower2, color: '#FCE7F3', desc: 'Pink', prompt: 'Street lined with blooming cherry blossom trees, pink petals falling, spring atmosphere.' },
        { id: 'lavender_field', label: 'Lavender', icon: Flower2, color: '#E0E7FF', desc: 'Purple', prompt: 'Rows of purple lavender fields in Provence, sunny day, vibrant colors, scent of summer.' },
        { id: 'jungle_waterfall', label: 'Jungle', icon: Droplets, color: '#064E3B', desc: 'Lush', prompt: 'Tropical rainforest waterfall, lush green vegetation, rocks, mist, dramatic nature.' },
        { id: 'desert_dune', label: 'Dune', icon: Sun, color: '#FFEDD5', desc: 'Sand', prompt: 'Smooth sand dunes in sahara desert, wind ripples, sharp shadows, clear blue sky, minimal.' },
        { id: 'rocky_coast', label: 'Coast', icon: Waves, color: '#374151', desc: 'Ocean', prompt: 'Rugged coastline with black rocks, crashing waves, moody sky, cinematic seascape.' },
    ],
    'modern': [
        { id: 'minimal_arch', label: 'Arch', icon: Building2, color: '#F3F4F6', desc: 'Concrete', prompt: 'Minimalist concrete architecture, sharp geometric lines, abstract shadows, grey tones.' },
        { id: 'art_gallery', label: 'Gallery', icon: GalleryVerticalEnd, color: '#F9FAFB', desc: 'White', prompt: 'White cube art gallery space, polished concrete floor, track lighting, spacious and empty.' },
        { id: 'neon_street', label: 'Street', icon: Zap, color: '#1E1B4B', desc: 'Neon', prompt: 'Cyberpunk city street at night, rain wet pavement, neon signs reflection, blue and pink lights.' },
        { id: 'luxury_retail', label: 'Retail', icon: ShoppingBag, color: '#F8FAFC', desc: 'Boutique', prompt: 'High-end boutique interior, marble floors, glass displays, minimal shelving, expensive lighting.' },
        { id: 'penthouse', label: 'Penthouse', icon: Hotel, color: '#E5E7EB', desc: 'View', prompt: 'Modern penthouse living room, floor to ceiling windows, city skyline view, italian furniture.' },
        { id: 'pool_villa', label: 'Villa', icon: Umbrella, color: '#E0F2FE', desc: 'Pool', prompt: 'Modern white villa architecture, blue swimming pool, sun loungers, clean lines, sunny day.' },
        { id: 'fashion_runway', label: 'Runway', icon: Activity, color: '#18181b', desc: 'Show', prompt: 'Fashion runway, dark audience background, bright spotlight on runway, catwalk atmosphere.' },
        { id: 'subway_station', label: 'Subway', icon: Box, color: '#E5E5E5', desc: 'Urban', prompt: 'Clean modern subway station, tiles, symmetry, fluorescent light, urban transit vibe.' },
        { id: 'elevator', label: 'Elevator', icon: Box, color: '#D4D4D8', desc: 'Metal', prompt: 'Inside a modern metal elevator, mirrored walls, buttons, cool lighting, claustrophobic chic.' },
        { id: 'spiral_garage', label: 'Garage', icon: Circle, color: '#A1A1AA', desc: 'Raw', prompt: 'Concrete parking garage spiral ramp, architectural curve, raw texture, urban exploration.' },
    ],
    'vintage': [
        { id: 'library_old', label: 'Old Library', icon: Library, color: '#FFF7ED', desc: 'Books', prompt: 'Ancient library, towering bookshelves, rolling ladder, dust motes in light, dark academia.' },
        { id: 'paris_cafe', label: 'Cafe', icon: Coffee, color: '#FEF3C7', desc: 'Paris', prompt: 'Outdoor seating of a parisian cafe, rattan chairs, round tables, street view, morning coffee vibe.' },
        { id: 'antique_shop', label: 'Antique', icon: Armchair, color: '#78350F', desc: 'Clutter', prompt: 'Cluttered antique shop interior, vintage lamps, mirrors, furniture, warm cozy chaos.' },
        { id: 'train_cabin', label: 'Train', icon: Train, color: '#064E3B', desc: 'Travel', prompt: 'Orient Express style train cabin, velvet seats, wood paneling, window view of passing landscape.' },
        { id: 'vinyl_store', label: 'Vinyl', icon: Music, color: '#1F2937', desc: 'Retro', prompt: 'Record store interior, rows of vinyl records, music posters, retro vibe, warm lighting.' },
        { id: 'film_noir', label: 'Noir', icon: Camera, color: '#171717', desc: 'B&W', prompt: 'Film noir style street scene, wet cobblestones, fog, street lamp, high contrast black and white.' },
        { id: 'jazz_bar', label: 'Jazz Bar', icon: Music, color: '#7F1D1D', desc: 'Moody', prompt: 'Dimly lit jazz bar, smoke haze, stage with instruments, red booth seating, intimate atmosphere.' },
        { id: 'american_diner', label: 'Diner', icon: Coffee, color: '#EF4444', desc: '50s', prompt: 'Retro 50s American diner, checkerboard floor, red leather stools, neon sign, milkshake vibe.' },
        { id: 'rustic_barn', label: 'Barn', icon: Home, color: '#92400E', desc: 'Rustic', prompt: 'Interior of a rustic wooden barn, hay bales, string lights, wooden beams, country wedding style.' },
        { id: 'polaroid', label: 'Polaroid', icon: Camera, color: '#F3F4F6', desc: 'Flash', prompt: 'Vintage polaroid style background, washed out colors, flash photography look, nostalgic memory.' },
    ],
};

// PLANTING PRESETS (NEW)
const PLANTING_PRESETS = [
    { id: 'city_walk', label: 'City Walk', icon: Footprints, desc: 'Street/Relaxed', prompt: 'Street style OOTD, walking on a chic city street, candid shot, coffee in hand, natural sunlight, blurred city background.' },
    { id: 'cafe_vibe', label: 'Cafe', icon: Coffee, desc: 'Lifestyle', prompt: 'Sitting in a minimalist cafe, natural window light, relaxed pose, lifestyle vibe, aesthetic composition.' },
    { id: 'home_cozy', label: 'Home', icon: Sofa, desc: 'Cozy/Mirror', prompt: 'Cozy home environment, soft texture, warm lighting, mirror selfie style or relaxed on sofa, intimate atmosphere.' },
    { id: 'nature_park', label: 'Park', icon: Trees, desc: 'Nature', prompt: 'Outdoor park setting, green grass, bright sunlight, picnic vibe, fresh and energetic.' },
    { id: 'art_gallery', label: 'Gallery', icon: GalleryVerticalEnd, desc: 'Art/Minimal', prompt: 'Art gallery background, clean white walls, minimalist architecture, high-end fashion aesthetic, cool tones.' },
    { id: 'travel_resort', label: 'Resort', icon: Palmtree, desc: 'Vacation', prompt: 'Luxury resort or beach setting, holiday vibe, blue sky, golden hour light, relaxed vacation mood.' }
];

// 光影类型
const LIGHTING_OPTIONS: { id: LightingType; label: string; icon: any }[] = [
    { id: 'soft', label: 'Soft', icon: Sun },
    { id: 'natural', label: 'Natural', icon: Sparkles },
    { id: 'studio', label: 'Studio', icon: Lamp },
    { id: 'cinematic', label: 'Cinematic', icon: Moon },
];

// --- POSE CONFIGURATION (UPDATED STRUCTURE) ---

const POSE_CATEGORIES = [
    { id: 'shot_type', label: 'Shot Type', icon: Focus },
    { id: 'body_pose', label: 'Body Pose', icon: Move },
    { id: 'style_vibe', label: 'Vibe', icon: Zap },
];

const POSE_PRESETS: Record<string, {id: string, label: string, icon: any, color: string, prompt: string, desc: string}[]> = {
    'shot_type': [ // 特色/头像照, 半身照, 全身照
        { id: 'headshot_45', label: '45° Face', icon: ScanFace, color: '#F0F9FF', desc: 'Headshot', prompt: 'Close-up headshot, model turning face 45 degrees, chin slightly tucked, focusing on facial features and jewelry, soft shallow depth of field.' },
        { id: 'headshot_chin', label: 'Hand Chin', icon: Smile, color: '#FFF7ED', desc: 'Interactive', prompt: 'Close-up portrait, model gently resting hand on chin or tucking hair behind ear, elegant fingers, soft gaze at camera.' },
        { id: 'headshot_closed', label: 'Eyes Closed', icon: EyeOff, color: '#F3E8FF', desc: 'Emotive', prompt: 'Close-up emotive portrait, model with eyes closed, slight smile or meditative expression, soft lighting, peaceful atmosphere.' },
        { id: 'half_hips', label: 'Hands Hips', icon: User, color: '#ECFCCB', desc: 'Waist', prompt: 'Medium shot (waist up), model with hands on hips, elbows out, highlighting waistline and upper body garment structure, confident pose.' },
        { id: 'half_pockets', label: 'Pockets', icon: Box, color: '#F3F4F6', desc: 'Casual', prompt: 'Medium shot, model with hands casually in pockets, relaxed shoulders, natural lifestyle vibe, studio lighting.' },
        { id: 'half_arms', label: 'Arms Crossed', icon: Activity, color: '#E5E5E5', desc: 'Business', prompt: 'Medium shot, model with arms crossed confidently, standing straight, professional business look, sharp focus.' },
        { id: 'half_prop', label: 'With Prop', icon: Coffee, color: '#FEF3C7', desc: 'Lifestyle', prompt: 'Medium shot, model holding a prop (coffee cup/book/hat), interacting with object, lifestyle context, candid feel.' },
        { id: 'full_scurve', label: 'S-Curve', icon: Activity, color: '#FCE7F3', desc: 'Elegant', prompt: 'Full body shot, model standing with weight on back leg, creating an S-curve silhouette, one leg slightly forward, feminine and elegant.' },
        { id: 'full_wall', label: 'Leaning', icon: Building2, color: '#E0E7FF', desc: 'Relaxed', prompt: 'Full body shot, model leaning back against a wall or pillar, one foot resting on wall, relaxed cool posture.' },
        { id: 'full_walk', label: 'Walking', icon: Footprints, color: '#DCFCE7', desc: 'Dynamic', prompt: 'Full body action shot, model walking towards camera, mid-stride, clothes flowing, hair moving, fashion week street style.' },
    ],
    'body_pose': [ // 站姿, 坐姿, 躺姿, 蹲姿
        { id: 'stand_basic', label: 'Standing', icon: User, color: '#F9FAFB', desc: 'Basic', prompt: 'Static full body pose, model standing straight, shoulders relaxed and down, chest out, neutral symmetrical stance, showing full outfit.' },
        { id: 'stand_37', label: 'Contrapposto', icon: Activity, color: '#DBEAFE', desc: 'Legs', prompt: 'Standing pose, "Contrapposto" stance, weight on one leg, hips tilted, other leg relaxed and extended, creating long leg line.' },
        { id: 'stand_back', label: 'Back View', icon: UserCog, color: '#FDF2F8', desc: 'Back', prompt: 'Model standing with back to camera, turning head over shoulder to look back, showcasing back design of clothing, elegant neck line.' },
        { id: 'sit_chair', label: 'Sitting', icon: Armchair, color: '#FFFBEB', desc: 'Chair', prompt: 'Model sitting on the edge of a chair, back straight, legs crossed elegantly or extended, hands on lap, studio portrait.' },
        { id: 'sit_floor', label: 'Floor Sit', icon: Layers, color: '#F3F4F6', desc: 'Casual', prompt: 'Model sitting on the floor, cross-legged or legs swept to side, casual and grounded, looking at camera.' },
        { id: 'sit_stairs', label: 'Stairs', icon: AlignRight, color: '#E5E5E5', desc: 'Levels', prompt: 'Model sitting on stairs, one leg bent higher than other, creating diagonal lines, urban or architectural setting.' },
        { id: 'lie_side', label: 'Lying Side', icon: Moon, color: '#F0FDFA', desc: 'Curves', prompt: 'Model lying on side, propping head up with one hand, body creating a long curve, relaxed and intimate vibe.' },
        { id: 'lie_top', label: 'Top Down', icon: Camera, color: '#EEF2FF', desc: 'Creative', prompt: 'Top-down view, model lying on back, hair spread out, looking up at camera, creative composition.' },
        { id: 'squat_one', label: 'Kneeling', icon: Triangle, color: '#FEF9C3', desc: 'Strong', prompt: 'Model kneeling on one knee, other foot planted, hands on thigh, strong athletic or streetwear pose.' },
        { id: 'squat_deep', label: 'Squat', icon: Circle, color: '#1F2937', desc: 'Street', prompt: 'Model in deep squat, knees apart, elbows resting on knees, looking up, edgy street fashion style.' },
    ],
    'style_vibe': [ // 时尚, 清新, 性感, 可爱
        { id: 'style_cool', label: 'Cool', icon: Zap, color: '#312E81', desc: 'High Fashion', prompt: 'High fashion editorial style, model with aloof cool expression, sharp jawline, dramatic pose, vogue magazine aesthetic.' },
        { id: 'style_fresh', label: 'Fresh', icon: Leaf, color: '#DCFCE7', desc: 'Natural', prompt: 'Fresh and natural style, model smiling gently, soft sunlight, interacting with flowers or nature, airy atmosphere.' },
        { id: 'style_sexy', label: 'Sexy', icon: Heart, color: '#BE123C', desc: 'Glamour', prompt: 'Sultry and glamorous style, wet hair look, parted lips, intense gaze, accentuating body curves, moody lighting.' },
        { id: 'style_cute', label: 'Cute', icon: Star, color: '#FCE7F3', desc: 'Playful', prompt: 'Cute and playful vibe, model making heart shape with hands, winking, or jumping joyfully, bright colors, energetic.' },
        { id: 'style_minimal', label: 'Minimal', icon: Box, color: '#F3F4F6', desc: 'Clean', prompt: 'Minimalist aesthetic, neutral expression, simple geometric pose, clean background, emphasis on structure and form.' },
        { id: 'style_vintage', label: 'Vintage', icon: Camera, color: '#78350F', desc: 'Film', prompt: 'Vintage film look, nostalgic pose, grain texture, warm muted colors, 90s fashion editorial vibe.' },
    ]
};

// Flatten presets for generation logic compatibility
const FLATTENED_POSES = [
    ...POSE_PRESETS['shot_type'],
    ...POSE_PRESETS['body_pose'],
    ...POSE_PRESETS['style_vibe']
];

const MODEL_STYLES = [
  { id: 'original', label: 'Keep Original' },
  { id: 'asian', label: 'Asian' },
  { id: 'caucasian', label: 'Caucasian' },
  { id: 'latina', label: 'Latina' },
  { id: 'african', label: 'African' },
];

const EXPRESSIONS = [
  { id: 'neutral', label: 'Neutral', icon: Meh },
  { id: 'smile', label: 'Smile', icon: Smile },
  { id: 'confident', label: 'Cool', icon: User },
];

// --- FUSION WORKFLOW CONSTANTS (NEW) ---

const FUSION_SKIN_TONES = [
    { id: 'fair', color: '#F3E5DC', label: 'Fair', desc: 'Porcelain' },
    { id: 'medium', color: '#E8Cca8', label: 'Medium', desc: 'Warm' },
    { id: 'tan', color: '#C68642', label: 'Tan', desc: 'Bronze' },
    { id: 'deep', color: '#8D5524', label: 'Deep', desc: 'Dark' }
];

const FUSION_BODY_SHAPES = [
    { id: 'slim', label: 'Slim', desc: 'Model', icon: User },
    { id: 'athletic', label: 'Athletic', desc: 'Fit', icon: Activity },
    { id: 'curvy', label: 'Curvy', desc: 'Hourglass', icon: Heart },
    { id: 'plus', label: 'Plus', desc: 'Plus Size', icon: Circle },
];

const FUSION_CROPS = [
    { id: 'full_body', label: 'Full', desc: 'Full Body', icon: User },
    { id: 'headless', label: 'Headless', desc: 'Garment Focus', icon: Shirt },
    { id: 'detail', label: 'Detail', desc: 'Close-up', icon: ZoomIn },
];

const MAGIC_TAGS = [
    { id: 'soft_light', label: 'Soft Light' },
    { id: 'luxury', label: 'Luxury' },
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'flowers', label: 'Flowers' },
    { id: 'silk', label: 'Silk' },
    { id: 'sunlight', label: 'Sunlight' },
    { id: 'beach', label: 'Beach' },
];

// --- EXTRACTION CONSTANTS ---
const EXTRACTION_CATEGORIES = [
    { id: 'veil', label: 'Veil', icon: Star, desc: 'Veil', prompt: 'Wedding Veil, transparent lace texture, soft tulle, flowing details' },
    { id: 'shawl', label: 'Shawl', icon: Shirt, desc: 'Shawl', prompt: 'Wedding Shawl, fur or lace material, elegant drape' },
    { id: 'gloves', label: 'Gloves', icon: Box, desc: 'Gloves', prompt: 'Bridal Gloves, satin or lace, delicate finger details' },
    { id: 'petticoat', label: 'Skirt', icon: Layers, desc: 'Petticoat', prompt: 'Bridal Petticoat, crinoline, volume structure, white' },
    { id: 'belt', label: 'Belt', icon: Circle, desc: 'Belt', prompt: 'Bridal Belt, sash, crystal rhinestones, satin ribbon' },
    { id: 'headpiece', label: 'Headpiece', icon: Crown, desc: 'Headpiece', prompt: 'Bridal Headpiece, tiara, hair vine, pearls and crystals' },
];

// --- DETAIL PRESETS ---
const DETAIL_PRESETS = [
    { id: 'fabric', label: 'Texture', desc: 'Fabric', icon: Layers, prompt: 'Extreme close-up macro shot of the fabric texture, showing thread details, weaving pattern, and material quality. Soft lighting to reveal texture depth.' },
    { id: 'collar', label: 'Collar', desc: 'Collar', icon: Shirt, prompt: 'Close-up shot of the collar area, focusing on the neckline design, stitching precision, and fabric drape.' },
    { id: 'cuff', label: 'Cuff', desc: 'Cuff', icon: Box, prompt: 'Close-up detail of the sleeve cuff, focusing on the hem, folding, and finish quality.' },
    { id: 'button', label: 'Button', desc: 'Buttons', icon: Circle, prompt: 'Macro shot of the buttons or zippers, highlighting hardware material, gloss, and attachment quality.' },
    { id: 'pattern', label: 'Pattern', desc: 'Pattern', icon: Palette, prompt: 'Detailed close-up of the pattern, print, or embroidery work. Sharp focus on the artistic details.' },
    { id: 'stitch', label: 'Stitch', desc: 'Stitching', icon: Activity, prompt: 'Close-up view of the stitching and seam quality, demonstrating high-end craftsmanship and durability.' },
];

export const OperationPanel: React.FC = () => {
  const { 
    activeWorkflow, isGenerating, setIsGenerating, addLayer, setApiKeyMissing,
    getLayers, selectedLayerIds, selectLayer, toggleLayerVisibility, toggleLayerLock, removeLayer, moveLayer,
    canvasSize, setCanvasSize, language
  } = useAppStore();
  
  const layers = getLayers();
  const t = translations[language];
  
  // Use last selected for singular operations if needed, though most logic here is workflow-centric
  const selectedLayerId = selectedLayerIds[selectedLayerIds.length - 1];

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('low quality, bad anatomy, worst quality, text, watermark');
  const [selectedPlatform, setSelectedPlatform] = useState('amazon');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [quantity, setQuantity] = useState<number>(1);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  
  // Fission State
  const [poseCategory, setPoseCategory] = useState<string>('shot_type');
  const [selectedPoses, setSelectedPoses] = useState<string[]>(['stand_basic']);
  const [modelStyle, setModelStyle] = useState<string>('original');
  const [customPoseImage, setCustomPoseImage] = useState<string | null>(null);

  // Face Swap State
  const [faceSwapMode, setFaceSwapMode] = useState<FaceSwapMode>('model_swap');
  const [faceModelSource, setFaceModelSource] = useState<FaceModelSource>('preset');
  const [faceImage, setFaceImage] = useState<string | null>(null); // For Custom
  const [selectedPresetId, setSelectedPresetId] = useState<string>('asia_1'); // For Preset/Fixed
  const [faceSimilarity, setFaceSimilarity] = useState<number>(80); // 80% default
  const [expression, setExpression] = useState<string>('neutral');
  const [ageGroup, setAgeGroup] = useState<string>('20s');

  // Background Swap State
  const [sceneCategory, setSceneCategory] = useState<string>('studio'); // Default to Studio
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]); // Multi-select array
  const [bgLighting, setBgLighting] = useState<LightingType>('soft');
  const [bgBlur, setBgBlur] = useState<number>(0);

  // Fusion (Mannequin) State (NEW)
  const [fusionImages, setFusionImages] = useState<string[]>([]); // New: Multiple images
  const [fusionSkinTone, setFusionSkinTone] = useState<string>('medium');
  const [fusionBodyShape, setFusionBodyShape] = useState<string>('slim');
  const [fusionComposition, setFusionComposition] = useState<string>('full_body');
  // Extended Fusion States
  const [fusionModelMode, setFusionModelMode] = useState<'attributes' | 'preset' | 'custom'>('attributes');
  const [fusionPoseMode, setFusionPoseMode] = useState<'auto' | 'template'>('auto');
  const [fusionSceneMode, setFusionSceneMode] = useState<'white' | 'template' | 'custom'>('white');
  const [fusionSelectedPoseId, setFusionSelectedPoseId] = useState<string>('');
  const [fusionSelectedSceneId, setFusionSelectedSceneId] = useState<string>('');
  const [fusionCustomSceneImg, setFusionCustomSceneImg] = useState<string | null>(null);
  const [fusionAutoCutout, setFusionAutoCutout] = useState(false);

  // --- EXTRACTION STATE ---
  const [extractCategory, setExtractCategory] = useState<string>('veil');
  const [extractMode, setExtractMode] = useState<'standard' | 'custom'>('standard');

  // --- PLANTING (SEEDING) STATE ---
  const [plantingPreset, setPlantingPreset] = useState<string>('city_walk');

  // --- DETAIL STATE ---
  const [detailFocus, setDetailFocus] = useState<string[]>(['fabric']);

  // --- AGENT BATCH STATE ---
  const [batchImages, setBatchImages] = useState<string[]>([]); // Multiple inputs
  const [batchSelectedModelId, setBatchSelectedModelId] = useState<string>('asia_1');
  const [batchSelectedPoseIds, setBatchSelectedPoseIds] = useState<string[]>([]);
  const [batchSelectedSceneIds, setBatchSelectedSceneIds] = useState<string[]>([]);
  // Progress tracking for Batch
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number} | null>(null);

  const [isEnhancing, setIsEnhancing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fusionInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const poseInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Sync aspect ratio when platform changes
  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    const platform = PLATFORMS.find(p => p.id === platformId);
    if (platform) {
      setAspectRatio(platform.ratio);
    }
  };

  const handleError = (e: any) => {
    const errorMsg = e.message || JSON.stringify(e);
    console.error("Operation Error:", errorMsg);
    if (errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED')) {
      setApiKeyMissing(true);
      setIsGenerating(false); // Make sure to stop generating flag on auth error
    } 
    // Don't alert for every error in batch process to avoid spam, just log
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const src = reader.result as string;
        setUploadedImage(src);
        const { width, height } = await loadImageDimensions(src);
        const size = calculateLayerSize(width, height, 500); 
        addLayer({ type: 'image', src: src, x: 50, y: 50, width: size.width, height: size.height, name: "商品参考图" });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle multiple uploads for Fusion
  const handleFusionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach((file) => {
              const reader = new FileReader();
              reader.onloadend = async () => {
                  const src = reader.result as string;
                  setFusionImages(prev => {
                      const newImages = [...prev, src];
                      // Sync main image for preview usage
                      if (!uploadedImage) setUploadedImage(newImages[0]);
                      return newImages;
                  });
              };
              reader.readAsDataURL(file as Blob);
          });
      }
      e.target.value = ''; // Reset input
  };

  const removeFusionImage = (index: number) => {
      setFusionImages(prev => {
          const newImages = prev.filter((_, i) => i !== index);
          if (newImages.length === 0) setUploadedImage(null);
          else if (index === 0) setUploadedImage(newImages[0]);
          return newImages;
      });
  };

  // Handle multiple uploads for Agent Batch
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach((file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setBatchImages(prev => [...prev, reader.result as string]);
              };
              reader.readAsDataURL(file as Blob);
          });
      }
      e.target.value = '';
  };
  
  const removeBatchImage = (index: number) => {
      setBatchImages(prev => prev.filter((_, i) => i !== index));
  };

  // Sync primary uploaded image for Fusion
  useEffect(() => {
    if (activeWorkflow === 'fusion') {
        if (fusionImages.length > 0) {
            setUploadedImage(fusionImages[0]);
        } else {
            setUploadedImage(null);
        }
    }
  }, [fusionImages, activeWorkflow]);

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImage(reader.result as string);
        if (activeWorkflow === 'face_swap') setFaceModelSource('custom');
        if (activeWorkflow === 'fusion') setFusionModelMode('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePoseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomPoseImage(reader.result as string);
        if (!selectedPoses.includes('custom_upload')) setSelectedPoses(['custom_upload']);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSceneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFusionCustomSceneImg(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
  };

  const handleAnalyze = async () => {
    if (!uploadedImage) return;
    setIsGenerating(true);
    try {
      const result = await analyzeImage(uploadedImage);
      setAnalysisResult(result.description);
      setPrompt(prev => `${prev} ${result.description}`.trim());
    } catch (e) { handleError(e); } finally { setIsGenerating(false); }
  };

  const handleSmartEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (e) { handleError(e); } finally { setIsEnhancing(false); }
  };

  const togglePose = (poseId: string) => {
    if (poseId === 'custom_upload') {
        setSelectedPoses(['custom_upload']);
        if (!customPoseImage) poseInputRef.current?.click();
        return;
    }
    let newPoses = selectedPoses.includes('custom_upload') ? [] : [...selectedPoses];
    if (newPoses.includes(poseId)) {
        newPoses = newPoses.filter(id => id !== poseId);
    } else {
        if (newPoses.length >= 12) {
            alert(t['alert.pose_limit']);
            return;
        }
        newPoses.push(poseId);
    }
    setSelectedPoses(newPoses);
  };

  // --- REFACTORED GENERATION LOGIC ---
  const handleGenerate = async () => {
      setIsGenerating(true);
      setBatchProgress(null); // Reset progress

      // Helper to add layer safely
      const addGeneratedLayer = async (url: string, namePrefix: string, index: number) => {
          try {
              const { width, height } = await loadImageDimensions(url);
              // Smart Positioning
              const col = index % 3;
              const row = Math.floor(index / 3);
              const spacingX = 350; // reduced gap
              const spacingY = 450;
              const startX = 50 + (col * spacingX);
              const startY = 50 + (row * spacingY);
              
              const size = calculateLayerSize(width, height, 320);
              
              addLayer({ 
                  type: 'image', 
                  src: url, 
                  x: startX, 
                  y: startY, 
                  width: size.width, 
                  height: size.height, 
                  name: `${namePrefix} ${index + 1}` 
              });
          } catch (e) {
              console.error("Failed to add layer:", e);
          }
      };

      try {
        // --- 0. AGENT BATCH MODE ---
        if (activeWorkflow === 'agent_batch') {
            if (batchImages.length === 0) {
                alert(t['alert.upload_product']);
                setIsGenerating(false);
                return;
            }
            
            // Collect Tasks (Cartesian Product of Images x Poses x Scenes)
            // If no pose/scene selected, we act as if 1 generic option is selected
            const posesToProcess = batchSelectedPoseIds.length > 0 ? batchSelectedPoseIds : ['default_pose'];
            const scenesToProcess = batchSelectedSceneIds.length > 0 ? batchSelectedSceneIds : ['default_scene'];
            
            const tasks: Array<{img: string, pose: string, scene: string}> = [];
            
            batchImages.forEach(img => {
                posesToProcess.forEach(pose => {
                    scenesToProcess.forEach(scene => {
                         tasks.push({ img, pose, scene });
                    });
                });
            });

            if (tasks.length === 0) {
                 setIsGenerating(false);
                 return;
            }

            if (tasks.length > 50) {
                if(!confirm(t['alert.batch_confirm'].replace('{n}', tasks.length.toString()))) {
                    setIsGenerating(false);
                    return;
                }
            }

            // --- CONCURRENCY CONTROL ---
            const CONCURRENCY_LIMIT = 3; // Limit parallel requests to prevent timeouts/freezing
            let completedCount = 0;
            const targetModel = PRESET_MODELS.find(m => m.id === batchSelectedModelId);
            setBatchProgress({ current: 0, total: tasks.length });

            // Chunk tasks
            for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
                const chunk = tasks.slice(i, i + CONCURRENCY_LIMIT);
                
                // Process chunk in parallel
                await Promise.all(chunk.map(async (task, chunkIdx) => {
                    const globalIdx = i + chunkIdx;
                    try {
                        const poseData = FLATTENED_POSES.find(p => p.id === task.pose);
                        let sceneData = null;
                        for (const cat in SCENE_PRESETS) {
                            const found = SCENE_PRESETS[cat].find(s => s.id === task.scene);
                            if (found) { sceneData = found; break; }
                        }
  
                        let batchPrompt = `[TASK]: Professional E-commerce Batch Production. `;
                        batchPrompt += `[INPUT]: Product Reference Image. `;
                        batchPrompt += `[MODEL]: ${targetModel?.desc || 'Professional model'}. `;
                        if (poseData) batchPrompt += `[POSE]: ${poseData.prompt}. `;
                        if (sceneData) batchPrompt += `[SCENE]: ${sceneData.prompt}. `;
                        else batchPrompt += `[SCENE]: Clean professional background. `;
                        
                        batchPrompt += `[CONSTRAINT]: Maintain the product clothing details exactly. Change the model and background. `;
                        if (prompt) batchPrompt += `[DETAILS]: ${prompt}`;
  
                        const url = await generateImage({
                            prompt: batchPrompt,
                            negativePrompt: negativePrompt + ", bad anatomy, deformed",
                            aspectRatio,
                            imageSize,
                            referenceImage: task.img,
                            workflow: 'fusion' // Use fusion/mannequin logic as it's most robust for "person wearing X"
                        });
                        
                        await addGeneratedLayer(url, `Batch-${globalIdx+1}`, globalIdx);
  
                    } catch (e) {
                        console.error(`Batch task ${globalIdx} failed`, e);
                        // Do NOT throw, allowing others to proceed
                    } finally {
                        completedCount++;
                        setBatchProgress({ current: completedCount, total: tasks.length });
                    }
                }));
            }

            setIsGenerating(false);
            setBatchProgress(null);
            return;
        }

        // --- 1. Fission Workflow ---
        if (activeWorkflow === 'fission' && selectedPoses.length > 0) {
             // Enforce anti-collage negative prompt for Fission
             const fissionNegative = `${negativePrompt}, grid, collage, split screen, multiple views, multiple panels, storyboard, comic strip, borders, frames`;

             if (selectedPoses.includes('custom_upload')) {
               // Single Custom Pose
               if (!customPoseImage) { alert(t['alert.upload_skeleton']); setIsGenerating(false); return; }
               const stylePrompt = modelStyle !== 'original' ? `model ethnicity: ${modelStyle}` : 'keep model identity identical';
               
               // OPTIMIZED PROMPT: Anti-collage
               const fullPrompt = `
               [TASK]: Generate a SINGLE high-quality fashion photograph based on the skeleton pose.
               [LAYOUT]: Single full frame. Strictly NO collage, NO grid, NO multiple views.
               [STYLE]: ${stylePrompt}.
               [ACTION]: Follow provided skeleton perfectly.
               [DETAILS]: ${prompt}
               `.trim();
                
               try {
                   const imageUrl = await generateImage({
                      prompt: fullPrompt, negativePrompt: fissionNegative, aspectRatio, imageSize, referenceImage: uploadedImage || undefined, poseImage: customPoseImage, workflow: activeWorkflow
                   });
                   await addGeneratedLayer(imageUrl, "Custom Pose", 0);
               } catch (e) { handleError(e); }

             } else {
                // Batch Poses
                let completedCount = 0;
                const total = selectedPoses.length;

                const promises = selectedPoses.map(async (poseId, index) => {
                    // Use FLATTENED_POSES to find data from the new structure
                    const poseData = FLATTENED_POSES.find(p => p.id === poseId);
                    
                    // OPTIMIZED PROMPT: Anti-collage & Better Pose adherence
                    const fullPrompt = `
                    [TASK]: Generate a SINGLE professional fashion portrait.
                    [LAYOUT]: Single full frame image. Strictly NO collage, NO grid, NO split screen, NO multiple angles.
                    [MODEL]: ${modelStyle === 'original' ? 'Keep original model consistency' : `Model ethnicity: ${modelStyle}`}.
                    [POSE]: ${poseData?.prompt}.
                    [DETAILS]: ${prompt}
                    `.trim();
                    
                    try {
                        const url = await generateImage({ 
                            prompt: fullPrompt, negativePrompt: fissionNegative, aspectRatio, imageSize, referenceImage: uploadedImage || undefined, workflow: activeWorkflow 
                        });
                        await addGeneratedLayer(url, poseData?.label || "Pose", index);
                    } catch (e) {
                        console.error(`Pose ${poseId} failed:`, e);
                    } finally {
                        completedCount++;
                        if (completedCount === total) setIsGenerating(false);
                    }
                });
                return; 
             }
        } 
        
        // --- 2. Generic Loop (Includes Extraction, Detail, Planting) ---
        else {
            // Determine iteration source: either batch scenes (bg_swap) or quantity loop (others)
            let iterationSource: any[] = [];
            
            if ((activeWorkflow as string) === 'bg_swap') {
                if (selectedSceneIds.length === 0) {
                     alert(t['alert.select_scene']);
                     setIsGenerating(false);
                     return;
                }
                iterationSource = selectedSceneIds;
            } else if (activeWorkflow === 'detail') {
                if (detailFocus.length === 0) {
                     alert(t['alert.select_detail']);
                     setIsGenerating(false);
                     return;
                }
                iterationSource = detailFocus;
            } else {
                iterationSource = Array.from({ length: quantity });
            }

            const loopCount = iterationSource.length;
            let completedCount = 0;

            const tasks = iterationSource.map(async (item, index) => {
                try {
                    let config: any = {
                        prompt, negativePrompt, aspectRatio, imageSize, referenceImage: uploadedImage || undefined, workflow: activeWorkflow
                    };

                    // --- PLANTING WORKFLOW PROMPT LOGIC ---
                    if (activeWorkflow === 'planting') {
                        if (!uploadedImage) throw new Error(t['alert.upload_ref_garment']);
                        
                        const vibe = PLANTING_PRESETS.find(p => p.id === plantingPreset);
                        
                        let plantingPrompt = `[TASK]: Create a high-engagement "Social Media Seeding" (种草/Zhongcao) photo. `;
                        plantingPrompt += `[INPUT]: Product Reference (Clothing). `;
                        plantingPrompt += `[OUTFIT]: Preserve the clothing design, fabric, and fit EXACTLY as shown in the reference. `;
                        plantingPrompt += `[VIBE]: ${vibe?.prompt} `;
                        plantingPrompt += `[STYLE]: Influencer lifestyle shot, OOTD (Outfit of the Day), high aesthetic quality, candid and natural pose. `;
                        plantingPrompt += `[LIGHTING]: Natural, flattering, soft shadows, golden hour or cinematic ambient light. `;
                        plantingPrompt += `[MODEL]: Attractive model fitting the scene, engaging with the camera or environment naturally. `;
                        
                        // Add Variation based on index if quantity > 1
                        if (quantity > 1) {
                             const poses = ['walking towards camera', 'standing casually', 'looking back over shoulder', 'interacting with environment', 'close up shot', 'full body relaxed shot', 'sitting comfortably'];
                             const randomPose = poses[index % poses.length];
                             plantingPrompt += `[POSE VARIATION]: ${randomPose}. `;
                        }
                        
                        if (prompt) plantingPrompt += `[ADDITIONAL]: ${prompt}`;

                        config.prompt = plantingPrompt;
                        config.negativePrompt = `${negativePrompt}, ugly, deformed, mannequin, plastic, stiff pose, studio background, low resolution, bad hands`;
                    }
                    // --- FUSION WORKFLOW PROMPT LOGIC ---
                    else if (activeWorkflow === 'fusion') {
                        // ... (Fusion Logic unchanged) ...
                        // Support multiple images for Fusion
                        if (fusionImages.length === 0) throw new Error(t['alert.upload_mannequin']);
                        config.referenceImages = fusionImages; // Pass the array

                        let fusionPrompt = `[TASK]: Mannequin to Real Human Model Transformation. `;
                        fusionPrompt += `[INPUT]: The uploaded images are mannequin/ghost mannequin shots of the SAME product from different angles. `;
                        if (fusionAutoCutout) fusionPrompt += `[ACTION]: Ignore the original background of the uploaded images. Extract the garment cleanly. `;
                        
                        // Model Identity Logic
                        if (fusionModelMode === 'attributes') {
                            const skin = FUSION_SKIN_TONES.find(s => s.id === fusionSkinTone)?.label || 'Medium Skin';
                            const body = FUSION_BODY_SHAPES.find(s => s.id === fusionBodyShape)?.label || 'Slim';
                            fusionPrompt += `[MODEL ATTRIBUTES]: Skin Tone: ${skin}. Body Shape: ${body}. `;
                        } else if (fusionModelMode === 'preset' || fusionModelMode === 'custom') {
                            const model = PRESET_MODELS.find(m => m.id === selectedPresetId);
                            if (model && fusionModelMode === 'preset') {
                                fusionPrompt += `[MODEL IDENTITY]: Face and features resembling: ${model.label} (${model.desc}). `;
                            } else {
                                fusionPrompt += `[MODEL IDENTITY]: Use provided face reference in the second image. `;
                                config.faceImage = faceImage;
                                config.faceSwapConfig = { mode: 'face_swap', source: 'custom', similarity: 80 };
                            }
                        }

                        // Pose Logic (For missing torso)
                        if (fusionPoseMode === 'template' && fusionSelectedPoseId) {
                            const poseData = FLATTENED_POSES.find(p => p.id === fusionSelectedPoseId);
                            if (poseData) {
                                fusionPrompt += `[POSE REFERENCE]: The model must follow this pose: ${poseData.prompt}. Use this to infer missing limbs/torso if mannequin is incomplete. `;
                            }
                        } else {
                             fusionPrompt += `[POSE]: Infer pose from the mannequin's shape. `;
                        }

                        // Scene Logic
                        if (fusionSceneMode === 'white') {
                             fusionPrompt += `[SCENE]: Pure white background (#FFFFFF). `;
                        } else if (fusionSceneMode === 'template' && fusionSelectedSceneId) {
                             const scene = SCENE_PRESETS[sceneCategory]?.find(s => s.id === fusionSelectedSceneId);
                             if (scene) fusionPrompt += `[SCENE]: ${scene.prompt}. `;
                        } else if (fusionSceneMode === 'custom' && fusionCustomSceneImg) {
                             // Complex Image-to-Image with 2 references (Face + Scene) is hard for API directly in one go.
                             // We append text instruction for now.
                             fusionPrompt += `[SCENE]: Use provided background reference. `;
                        }

                        fusionPrompt += `[GOAL]: Generate a realistic human model wearing this EXACT garment. `;
                        fusionPrompt += `[CONSTRAINT]: CRITICAL - DO NOT CHANGE THE CLOTHING. Keep the fabric, folds, logo, and cut exactly as the reference. `;
                        
                        // Composition
                        if (fusionComposition === 'headless') {
                            fusionPrompt += `[COMPOSITION]: Headless crop. Focus strictly on the torso and garment fit. `;
                        } else if (fusionComposition === 'detail') {
                            fusionPrompt += `[COMPOSITION]: Close-up detail shot. Focus on fabric texture. `;
                        } else {
                            fusionPrompt += `[COMPOSITION]: Full body shot (including head and face). `;
                        }

                        if (prompt) fusionPrompt += `[ADDITIONAL]: ${prompt}`;

                        // Strengthen Negative Prompt for Fusion
                        config.negativePrompt = `${negativePrompt}, changing clothes, new outfit, different fabric, deformed body, plastic skin, mannequin joints, artificial look`;
                        config.prompt = fusionPrompt;
                    }
                    else if (activeWorkflow === 'extraction') {
                         if (!uploadedImage) throw new Error(t['alert.upload_ref_product']);

                         const category = EXTRACTION_CATEGORIES.find(c => c.id === extractCategory);
                         
                         let extractionPrompt = `[TASK]: Professional E-commerce Product Extraction. `;
                         extractionPrompt += `[INPUT]: Reference image containing a ${category?.label || 'product'}. `;
                         extractionPrompt += `[GOAL]: Extract the ${category?.label} from the image and place it on a clean background. `;
                         extractionPrompt += `[SUBJECT]: ${category?.prompt}. `;
                         
                         if (extractMode === 'standard') {
                             extractionPrompt += `[BACKGROUND]: Pure White Background (#FFFFFF). No shadows, no props. `;
                             extractionPrompt += `[STYLE]: High-end commercial product photography. Flat lay or Mannequin view. Sharp focus, high resolution. `;
                         } else {
                             extractionPrompt += `[INSTRUCTION]: ${prompt || 'Place on a clean, fitting background.'} `;
                         }
                         
                         extractionPrompt += `[CONSTRAINT]: Preserve all fabric details, lace textures, and transparency of the product. Do NOT alter the product design. `;
                         
                         config.prompt = extractionPrompt;
                         config.negativePrompt = `${negativePrompt}, busy background, messy, low resolution, blurry, distorted, mannequin parts visible`;
                    }
                    else if (activeWorkflow === 'detail') {
                         if (!uploadedImage) throw new Error(t['alert.upload_ref_product']);
                         
                         const focusId = item as string; // Item is the ID from iterationSource
                         const focusItem = DETAIL_PRESETS.find(p => p.id === focusId);
                         
                         let detailPrompt = `[TASK]: Commercial Product Photography - Macro Detail Shot. `;
                         detailPrompt += `[INPUT]: Reference image of a product. `;
                         detailPrompt += `[GOAL]: Generate an extreme close-up detail shot of the ${focusItem?.desc || 'fabric'}. `;
                         detailPrompt += `[VISUAL]: ${focusItem?.prompt} `;
                         detailPrompt += `[STYLE]: Hasselblad X2D quality, f/2.8 aperture, shallow depth of field, sharp focus on texture, soft professional lighting. `;
                         detailPrompt += `[CONSTRAINT]: The material/texture must match the reference image exactly. `;
                         
                         if (prompt) detailPrompt += `[ADDITIONAL]: ${prompt}`;

                         config.prompt = detailPrompt;
                         config.negativePrompt = `${negativePrompt}, blurry, out of focus, low resolution, distorted, whole product shown, messy background`;
                    }
                    else if (activeWorkflow === 'face_swap') {
                         if (!uploadedImage) throw new Error(t['alert.upload_base']);
                         
                         let fullPrompt = `TARGET: High-end e-commerce photography. `;
                         if (faceSwapMode === 'model_swap') fullPrompt += `ACTION: Swap Model Body & Head. PRESERVE: Clothing & Background strictly. `;
                         else if (faceSwapMode === 'head_swap') fullPrompt += `ACTION: Swap Head & Hair only. PRESERVE: Clothing, Body Posture, Background. `;
                         else fullPrompt += `ACTION: Face Inpainting only. PRESERVE: Hair, Head shape, Clothing, Body, Background. `;

                         if (faceModelSource === 'preset' || faceModelSource === 'fixed') {
                             const targetModel = [...PRESET_MODELS, ...FIXED_MODELS].find(m => m.id === selectedPresetId);
                             if (targetModel) fullPrompt += `FACE REFERENCE: Generate a face resembling: ${targetModel.label} (${targetModel.id}). `;
                         }
                         
                         fullPrompt += `SIMILARITY: ${faceSimilarity}%. EXPRESSION: ${expression}. AGE: ${ageGroup}. `;
                         if (prompt) fullPrompt += `DETAILS: ${prompt}`;
                         
                         let effectiveFaceImage = undefined;
                         if (faceModelSource === 'custom') effectiveFaceImage = faceImage || undefined;
                         
                         config = {
                            ...config,
                            prompt: fullPrompt,
                            faceImage: effectiveFaceImage,
                            faceSwapConfig: { mode: faceSwapMode, source: faceModelSource, similarity: faceSimilarity }
                         };
                    } else if ((activeWorkflow as string) === 'bg_swap') {
                         // Build Prompt from Scene Preset if selected
                         const sceneId = item as string; 
                         
                         let scenePrompt = prompt;
                         let sceneLabel = 'Scene';
                         let sceneCategoryForId = sceneCategory; // Default fallback
                         
                         if (sceneId) {
                            // Find scene in ALL categories since multi-select across categories is allowed
                            let scene = null;
                            for (const catKey in SCENE_PRESETS) {
                                const found = SCENE_PRESETS[catKey]?.find(s => s.id === sceneId);
                                if (found) {
                                    scene = found;
                                    sceneCategoryForId = catKey;
                                    break;
                                }
                            }
                            
                            if (scene) {
                                scenePrompt = `${scene.prompt} ${prompt}`;
                                sceneLabel = scene.label;
                            }
                         }
                         
                         config = {
                            ...config,
                            prompt: scenePrompt,
                            bgSwapConfig: { lighting: bgLighting, blur: bgBlur, sceneType: sceneCategoryForId }
                         };
                         
                         const url = await generateImage(config);
                         await addGeneratedLayer(url, sceneLabel, index);
                         return; // Done for bg_swap loop
                    } else {
                         // Creative / Others
                         config.prompt = prompt; // Ensure prompt is passed
                    }
                    
                    if (activeWorkflow !== 'bg_swap') {
                        let layerName = activeWorkflow === 'face_swap' ? 'FaceSwap' : (activeWorkflow === 'fusion' ? 'RealModel' : (activeWorkflow === 'extraction' ? 'Product' : (activeWorkflow === 'planting' ? 'Seeding' : 'Gen')));
                        
                        if (activeWorkflow === 'detail') {
                             const focusId = item as string;
                             const focusItem = DETAIL_PRESETS.find(p => p.id === focusId);
                             layerName = focusItem?.label || 'Detail';
                        }
                        
                        if (activeWorkflow === 'planting') {
                             const vibe = PLANTING_PRESETS.find(p => p.id === plantingPreset);
                             layerName = vibe?.label || 'Seeding';
                        }

                        const url = await generateImage(config);
                        await addGeneratedLayer(url, layerName, index);
                    }

                } catch (e) {
                    console.error(`Generation task ${index} failed:`, e);
                } finally {
                    completedCount++;
                    if (completedCount === loopCount) setIsGenerating(false);
                }
            });

            // Return to avoid default finally block
            return;
        }

      } catch (e: any) { 
          console.error("Operation Error:", e);
          alert(`${t['alert.error']} ${e.message}`); // Add alert here
          handleError(e); 
          setIsGenerating(false);
          setBatchProgress(null);
      }
      // If we didn't return early
      if (!(activeWorkflow === 'fission' && !selectedPoses.includes('custom_upload'))) {
         setIsGenerating(false);
      }
  };

  const getWorkflowTitle = (wf: WorkflowType) => {
    // Return key for translation
    return translations[language][`wf.${wf}` as keyof typeof translations.zh] || wf;
  };
  
  // Calculate if the button should be disabled
  const isButtonDisabled = useMemo(() => {
      if (isGenerating) return true;
      // Fixed: Only check batchImages for agent_batch
      if (activeWorkflow === 'agent_batch') return batchImages.length === 0;
      if (activeWorkflow === 'creative') return false; 
      // For all other workflows, image is required
      return !uploadedImage;
  }, [isGenerating, activeWorkflow, batchImages.length, uploadedImage]);

  // --- RENDER COMPONENT: LAYER LIST ---
  if (activeWorkflow === 'layer_management') {
     return (
        <div className="w-[360px] bg-white dark:bg-studio-900 border-r border-studio-200 dark:border-studio-800 flex flex-col h-full z-10">
          <div className="px-6 py-5 border-b border-studio-100 dark:border-studio-800">
            <h2 className="text-lg font-bold text-studio-900 dark:text-white flex items-center gap-2">{t['wf.layer_management']} ({layers.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <AnimatePresence>
              {layers.length === 0 ? (
                <div className="text-center py-12 text-studio-300 dark:text-studio-600">
                  <Layers className="mx-auto mb-3 opacity-40 w-10 h-10"/> <span className="text-sm">Empty</span>
                </div>
              ) : (
                [...layers].reverse().map((layer) => {
                  const isSelected = selectedLayerIds.includes(layer.id);
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      key={layer.id}
                      onClick={() => selectLayer(layer.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group hover:shadow-sm ${
                        isSelected 
                        ? 'bg-studio-50 dark:bg-studio-800 border-studio-300 dark:border-studio-500 ring-1 ring-studio-900/5' 
                        : 'bg-white dark:bg-studio-800 border-studio-100 dark:border-studio-700 hover:border-studio-200 dark:hover:border-studio-600'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-studio-100 dark:bg-studio-700 overflow-hidden shrink-0 border border-studio-200 dark:border-studio-600 relative">
                        {layer.type === 'image' && <img src={layer.src} className="w-full h-full object-cover" alt="" />}
                        {layer.type === 'text' && <div className="w-full h-full flex items-center justify-center text-xs text-studio-400 font-serif">T</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-studio-900 dark:text-white' : 'text-studio-700 dark:text-studio-300'}`}>{layer.name || "Untitled"}</h4>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} className="p-1.5 text-studio-400 hover:text-studio-900 dark:hover:text-white">{!layer.visible ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
                        <button onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }} className="p-1.5 text-studio-400 hover:text-amber-600">{layer.locked ? <Lock size={12}/> : <Unlock size={12}/>}</button>
                        <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} className="p-1.5 text-studio-400 hover:text-red-600"><Trash2 size={12}/></button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      );
  }

  // --- RENDER COMPONENT: MAIN WORKFLOW PANEL ---
  return (
    <div className="w-[420px] bg-white dark:bg-studio-900 border-r border-studio-200 dark:border-studio-800 flex flex-col h-full shadow-sharp z-10 font-sans transition-colors duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-studio-100 dark:border-studio-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-studio-900/95 backdrop-blur-sm z-20 transition-colors duration-300">
        <div>
            <h2 className="text-xl font-bold text-studio-900 dark:text-white flex items-center gap-2 tracking-tight">
            {activeWorkflow === 'creative' && <Wand2 className="w-5 h-5 text-studio-800 dark:text-studio-200" />}
            {activeWorkflow === 'agent_batch' && <Bot className="w-5 h-5 text-studio-800 dark:text-studio-200" />}
            {activeWorkflow === 'extraction' && <ScanLine className="w-5 h-5 text-studio-800 dark:text-studio-200" />}
            {activeWorkflow === 'detail' && <ZoomIn className="w-5 h-5 text-studio-800 dark:text-studio-200" />}
            {activeWorkflow === 'planting' && <Sprout className="w-5 h-5 text-studio-800 dark:text-studio-200" />}
            {getWorkflowTitle(activeWorkflow)}
            </h2>
            <p className="text-xs text-studio-400 dark:text-studio-500 mt-1 font-medium">{t['wf.subtitle']}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-hide bg-white dark:bg-studio-900 transition-colors duration-300">
        
        {/* Banner for Agent Batch */}
        {activeWorkflow === 'agent_batch' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-indigo-700 dark:text-indigo-400"><Bot size={16} /></div>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                   <strong>{t['tool.agent_batch.label']}:</strong> {t['tool.agent_batch.desc']}
                </p>
             </motion.div>
        )}

        {/* Banner for Planting */}
        {activeWorkflow === 'planting' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-green-700 dark:text-green-400"><Sprout size={16} /></div>
                <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                   <strong>{t['tool.planting.label']}:</strong> {t['tool.planting.desc']}
                </p>
             </motion.div>
        )}

        {/* Banner for Face Swap (NEW) */}
        {activeWorkflow === 'face_swap' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-rose-700 dark:text-rose-400"><Users size={16} /></div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                   <strong>{t['tool.face_swap.label']}:</strong> {t['tool.face_swap.desc']}
                </p>
             </motion.div>
        )}

        {/* Banner for Background Swap (NEW) */}
        {activeWorkflow === 'bg_swap' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-100 dark:border-cyan-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-cyan-700 dark:text-cyan-400"><ImageIcon size={16} /></div>
                <p className="text-xs text-cyan-800 dark:text-cyan-300 leading-relaxed">
                   <strong>{t['tool.bg_swap.label']}:</strong> {t['tool.bg_swap.desc']}
                </p>
             </motion.div>
        )}

        {/* Banner for Fission (UPDATED) */}
        {activeWorkflow === 'fission' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-violet-700 dark:text-violet-400"><Layers size={16} /></div>
                <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">
                   <strong>{t['tool.fission.label']}:</strong> {t['tool.fission.desc']}
                </p>
             </motion.div>
        )}

        {/* Banner for Extraction */}
        {activeWorkflow === 'extraction' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-blue-700 dark:text-blue-400"><BoxSelect size={16} /></div>
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                   <strong>{t['tool.extraction.label']}:</strong> {t['tool.extraction.desc']}
                </p>
             </motion.div>
        )}
        
        {/* Banner for Detail */}
        {activeWorkflow === 'detail' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-purple-700 dark:text-purple-400"><ZoomIn size={16} /></div>
                <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                   <strong>{t['tool.detail.label']}:</strong> {t['tool.detail.desc']}
                </p>
             </motion.div>
        )}

        {/* Banner for Fusion (New) */}
        {activeWorkflow === 'fusion' && (
             <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 rounded-lg p-3.5 flex gap-3"
             >
                <div className="text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={16} /></div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                   <strong>{t['tool.fusion.label']}:</strong> {t['tool.fusion.desc']}
                </p>
             </motion.div>
        )}

        {/* --- EXTRACTION WORKFLOW UI --- */}
        {activeWorkflow === 'extraction' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                {/* 1. Upload */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <ImageIcon size={14} className="text-studio-600 dark:text-studio-400"/> 
                        {t['op.upload_ref']}
                    </label>
                    <div 
                        className={`group relative h-40 rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
                            ${uploadedImage 
                                ? 'border-studio-900 dark:border-white' 
                                : 'border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:border-studio-400 dark:hover:border-studio-600 hover:bg-studio-100 dark:hover:bg-studio-700'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploadedImage ? (
                            <>
                                <img src={uploadedImage} alt="Ref" className="absolute inset-0 w-full h-full object-contain p-2 z-0 opacity-80 group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-white/20 group-hover:bg-black/10 transition-colors z-10" />
                                <button className="absolute bottom-2 right-2 bg-studio-900 text-white shadow-sm px-2 py-1 rounded text-xs font-medium z-20 opacity-0 group-hover:opacity-100 transition-opacity">{t['btn.change']}</button>
                            </>
                        ) : (
                            <>
                            <div className="w-10 h-10 bg-white dark:bg-studio-700 rounded-full border border-studio-200 dark:border-studio-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-studio-800 dark:text-studio-200">
                                <Upload size={18} />
                            </div>
                            <span className="text-xs text-studio-500 dark:text-studio-400 font-medium">{t['ui.upload.drag']}</span>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>
                </div>

                {/* 2. Category Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <Tag size={14} className="text-studio-600 dark:text-studio-400"/> 
                        2. Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {EXTRACTION_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setExtractCategory(cat.id)}
                                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all
                                    ${extractCategory === cat.id 
                                        ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white shadow-sm' 
                                        : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700 hover:bg-studio-50 dark:hover:bg-studio-700'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${extractCategory === cat.id ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-studio-100 dark:bg-studio-700 text-studio-500 dark:text-studio-400'}`}>
                                    <cat.icon size={14}/>
                                </div>
                                <div>
                                    <span className={`block text-xs font-bold ${extractCategory === cat.id ? 'text-studio-900 dark:text-white' : 'text-studio-700 dark:text-studio-300'}`}>{cat.label}</span>
                                    <span className="text-[10px] text-studio-400 dark:text-studio-500">{cat.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Mode Configuration */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <Wand2 size={14} className="text-studio-600 dark:text-studio-400"/> 
                        3. Mode
                    </label>
                    
                    <div className="flex bg-studio-100 dark:bg-studio-800 p-1 rounded-lg mb-2">
                         <button
                            onClick={() => setExtractMode('standard')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                ${extractMode === 'standard' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}
                         >
                             Standard
                         </button>
                         <button
                            onClick={() => setExtractMode('custom')}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                ${extractMode === 'custom' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}
                         >
                             Custom
                         </button>
                    </div>

                    {extractMode === 'standard' ? (
                        <div className="p-3 bg-studio-50 dark:bg-studio-800 border border-studio-200 dark:border-studio-700 rounded-lg text-xs text-studio-500 dark:text-studio-400 leading-relaxed">
                            <p>✅ Auto BG Removal</p>
                            <p>✅ Pure White Background (#FFFFFF)</p>
                            <p>✅ Enhanced Texture</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <textarea 
                                value={prompt} onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe custom scene..."
                                className="w-full h-24 p-3 rounded-lg border border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 text-sm placeholder:text-studio-400 dark:placeholder:text-studio-500 text-studio-900 dark:text-white focus:ring-1 focus:ring-studio-900 dark:focus:ring-white focus:bg-white dark:focus:bg-studio-900 transition-all outline-none resize-none"
                            />
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- PLANTING (SEEDING) WORKFLOW UI --- */}
        {activeWorkflow === 'planting' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                {/* 2. Vibe Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <Sparkles size={14} className="text-studio-600 dark:text-studio-400"/> 
                        {t['op.select_style']}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {PLANTING_PRESETS.map(vibe => {
                            const isSelected = plantingPreset === vibe.id;
                            return (
                                <button
                                    key={vibe.id}
                                    onClick={() => setPlantingPreset(vibe.id)}
                                    className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all
                                        ${isSelected 
                                            ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white shadow-md' 
                                            : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700 hover:bg-studio-50 dark:hover:bg-studio-700'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-studio-100 dark:bg-studio-700 text-studio-500 dark:text-studio-400'}`}>
                                        <vibe.icon size={14}/>
                                    </div>
                                    <div className="min-w-0">
                                        <span className={`block text-xs font-bold truncate ${isSelected ? 'text-studio-900 dark:text-white' : 'text-studio-700 dark:text-studio-300'}`}>{vibe.label}</span>
                                        <span className="text-[10px] text-studio-400 dark:text-studio-500 block truncate">{vibe.desc}</span>
                                    </div>
                                    {isSelected && <div className="ml-auto text-studio-900 dark:text-white"><CheckCircle2 size={14} fill="currentColor"/></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* --- AGENT BATCH WORKFLOW --- */}
        {activeWorkflow === 'agent_batch' ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                
                {/* 1. Assets Input (Multi) */}
                <div className="space-y-3">
                     <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <ImageIcon size={14} className="text-studio-600 dark:text-studio-400"/> 
                        {t['op.upload_ref']}
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                        {batchImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg border border-studio-200 dark:border-studio-700 overflow-hidden group bg-studio-50 dark:bg-studio-800">
                                <img src={img} className="w-full h-full object-cover" alt={`Batch ${idx}`} />
                                <button 
                                    onClick={() => removeBatchImage(idx)}
                                    className="absolute top-1 right-1 bg-white/90 text-studio-900 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:text-red-500"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        {batchImages.length < 10 && (
                            <div 
                                onClick={() => batchInputRef.current?.click()}
                                className="aspect-square rounded-lg border-2 border-dashed border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:bg-studio-100 dark:hover:bg-studio-700 hover:border-studio-400 dark:hover:border-studio-500 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-studio-700 border border-studio-200 dark:border-studio-600 flex items-center justify-center text-studio-400 dark:text-studio-500 group-hover:scale-110 transition-transform">
                                    <Plus size={16} />
                                </div>
                            </div>
                        )}
                     </div>
                     <input type="file" ref={batchInputRef} className="hidden" accept="image/*" multiple onChange={handleBatchUpload} />
                </div>

                {/* 2. Model Selection */}
                <div className="space-y-3">
                     <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <UserCheck size={14} className="text-studio-600 dark:text-studio-400"/> 
                        {t['op.select_model']}
                     </label>
                     <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-hide">
                         {PRESET_MODELS.map(model => (
                             <div 
                                key={model.id}
                                onClick={() => setBatchSelectedModelId(model.id)}
                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                                    ${batchSelectedModelId === model.id ? 'border-studio-900 dark:border-white ring-2 ring-studio-900/20 dark:ring-white/20' : 'border-transparent'}`}
                             >
                                <img src={model.src} alt={model.label} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] py-0.5 text-center truncate px-1 backdrop-blur-sm">
                                    {model.label}
                                </div>
                                {batchSelectedModelId === model.id && (
                                    <div className="absolute top-1 right-1 text-white"><CheckCircle2 size={14} fill="black" /></div>
                                )}
                             </div>
                         ))}
                     </div>
                </div>

                {/* 3. Pose Selection (Multi) */}
                <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <Move size={14} className="text-studio-600 dark:text-studio-400"/> 
                            {t['op.select_pose']}
                        </label>
                        <span className="text-[10px] text-studio-400 dark:text-studio-500">Selected: {batchSelectedPoseIds.length}</span>
                     </div>
                     {/* Category Tabs for Pose */}
                     <div className="flex bg-studio-100 dark:bg-studio-800 p-1 rounded-lg mb-2">
                         {POSE_CATEGORIES.map(cat => (
                             <button
                                key={cat.id}
                                onClick={() => setPoseCategory(cat.id)}
                                className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all
                                    ${poseCategory === cat.id ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}
                             >
                                 {cat.label}
                             </button>
                         ))}
                     </div>
                     <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                         {POSE_PRESETS[poseCategory]?.map(pose => {
                             const isSel = batchSelectedPoseIds.includes(pose.id);
                             return (
                                 <button
                                     key={pose.id}
                                     onClick={() => {
                                         setBatchSelectedPoseIds(prev => isSel ? prev.filter(i => i !== pose.id) : [...prev, pose.id]);
                                     }}
                                     className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all
                                         ${isSel ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white' : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700 hover:bg-studio-50 dark:hover:bg-studio-700'}`}
                                 >
                                     <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isSel ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-studio-100 dark:bg-studio-700 text-studio-500 dark:text-studio-400'}`}>
                                         <pose.icon size={12}/>
                                     </div>
                                     <span className="text-[10px] font-bold text-studio-800 dark:text-studio-200 truncate">{pose.label}</span>
                                 </button>
                             );
                         })}
                     </div>
                </div>

                {/* 4. Scene Selection (Multi) */}
                <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <Palette size={14} className="text-studio-600 dark:text-studio-400"/> 
                            {t['op.select_scene']}
                        </label>
                        <span className="text-[10px] text-studio-400 dark:text-studio-500">Selected: {batchSelectedSceneIds.length}</span>
                     </div>
                     {/* Category Tabs for Scenes */}
                     <div className="grid grid-cols-4 gap-1.5 bg-studio-50 dark:bg-studio-800 p-1.5 rounded-xl border border-studio-100 dark:border-studio-700 mb-2">
                         {SCENE_CATEGORIES.slice(0, 4).map(cat => (
                             <button
                                key={cat.id}
                                onClick={() => setSceneCategory(cat.id)}
                                className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-all
                                    ${sceneCategory === cat.id ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400 hover:text-studio-700 dark:hover:text-studio-200'}`}
                             >
                                 <cat.icon size={12} />
                                 <span className="text-[9px]">{cat.label.slice(0,2)}</span>
                             </button>
                         ))}
                     </div>
                     <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                         {SCENE_PRESETS[sceneCategory]?.map(scene => {
                             const isSel = batchSelectedSceneIds.includes(scene.id);
                             return (
                                 <button
                                     key={scene.id}
                                     onClick={() => {
                                        setBatchSelectedSceneIds(prev => isSel ? prev.filter(i => i !== scene.id) : [...prev, scene.id]);
                                     }}
                                     className={`relative h-12 rounded-lg border flex items-center px-2 gap-2 text-left transition-all
                                         ${isSel ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white' : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700'}`}
                                     style={{ 
                                        background: isSel ? undefined : `linear-gradient(to right, ${scene.color}cc, transparent 90%)` 
                                     }}
                                 >
                                     <div className={`w-6 h-6 rounded-full flex items-center justify-center text-studio-600 shrink-0 ${isSel ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-white/50'}`}><scene.icon size={12}/></div>
                                     <span className={`text-[10px] font-medium truncate w-24 ${isSel ? 'text-studio-900 dark:text-white' : 'text-studio-800 dark:text-studio-200'}`}>{scene.label}</span>
                                     {isSel && <div className="absolute top-1 right-1 text-studio-900 dark:text-white"><CheckCircle2 size={10} fill="currentColor"/></div>}
                                 </button>
                             );
                         })}
                     </div>
                </div>
            </div>
        ) : (
        /* --- OTHER WORKFLOWS (EXISTING CODE) --- */
        <>
            {/* ... (Existing Single Upload UI) ... */}
            {activeWorkflow !== 'creative' && activeWorkflow !== 'extraction' && activeWorkflow !== 'planting' && (
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <ImageIcon size={14} className="text-studio-600 dark:text-studio-400"/> 
                        {t['op.upload_ref']}
                    </label>
                    {uploadedImage && <span className="text-[10px] font-medium text-white bg-studio-900 dark:bg-white dark:text-studio-900 px-2 py-0.5 rounded-sm flex items-center gap-1"><Check size={10}/></span>}
                </div>
                
                {activeWorkflow === 'fusion' ? (
                    // --- FUSION: MULTI IMAGE UPLOAD ---
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            {fusionImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg border border-studio-200 dark:border-studio-700 overflow-hidden group bg-studio-50 dark:bg-studio-800">
                                    <img src={img} className="w-full h-full object-cover" alt={`Mannequin ${idx}`} />
                                    <button 
                                        onClick={() => removeFusionImage(idx)}
                                        className="absolute top-1 right-1 bg-white/90 text-studio-900 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:text-red-500"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            
                            {/* Add Button */}
                            {fusionImages.length < 5 && (
                                <div 
                                    onClick={() => fusionInputRef.current?.click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:bg-studio-100 dark:hover:bg-studio-700 hover:border-studio-400 dark:hover:border-studio-500 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-studio-700 border border-studio-200 dark:border-studio-600 flex items-center justify-center text-studio-400 dark:text-studio-500 group-hover:scale-110 transition-transform">
                                        <Plus size={16} />
                                    </div>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fusionInputRef} className="hidden" accept="image/*" multiple onChange={handleFusionUpload} />
                    </div>
                ) : (
                    // --- DEFAULT: SINGLE IMAGE UPLOAD ---
                    <div 
                    className={`group relative h-40 rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
                        ${uploadedImage 
                            ? 'border-studio-900 dark:border-white' 
                            : 'border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:border-studio-400 dark:hover:border-studio-600 hover:bg-studio-100 dark:hover:bg-studio-700'}`}
                    onClick={() => fileInputRef.current?.click()}
                    >
                    {uploadedImage ? (
                        <>
                            <img src={uploadedImage} alt="Ref" className="absolute inset-0 w-full h-full object-contain p-2 z-0 opacity-80 group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-white/20 group-hover:bg-black/10 transition-colors z-10" />
                            <button className="absolute bottom-2 right-2 bg-studio-900 text-white shadow-sm px-2 py-1 rounded text-xs font-medium z-20 opacity-0 group-hover:opacity-100 transition-opacity">{t['btn.change']}</button>
                        </>
                    ) : (
                        <>
                        <div className="w-10 h-10 bg-white dark:bg-studio-700 rounded-full border border-studio-200 dark:border-studio-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-studio-800 dark:text-studio-200">
                            <Upload size={18} />
                        </div>
                        <span className="text-xs text-studio-500 dark:text-studio-400 font-medium">{t['ui.upload.drag']}</span>
                        </>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>
                )}
                
                {/* Fusion Auto Cutout Toggle */}
                {activeWorkflow === 'fusion' && uploadedImage && (
                    <div className="flex items-center gap-2 bg-studio-50 dark:bg-studio-800 p-2 rounded-lg border border-studio-100 dark:border-studio-700">
                        <button 
                            onClick={() => setFusionAutoCutout(!fusionAutoCutout)}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-semibold transition-all
                                ${fusionAutoCutout ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-white dark:bg-studio-700 text-studio-600 dark:text-studio-300 border border-studio-200 dark:border-studio-600'}`}
                        >
                            <Scissors size={12} />
                            Smart Cutout
                        </button>
                    </div>
                )}

                {/* Analyze Button */}
                {uploadedImage && activeWorkflow !== 'face_swap' && activeWorkflow !== 'bg_swap' && activeWorkflow !== 'fusion' && activeWorkflow !== 'detail' && (
                    <AnimatePresence>
                    {!analysisResult && (
                        <motion.button 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            onClick={handleAnalyze} disabled={isGenerating}
                            className="w-full py-2 bg-studio-100 dark:bg-studio-800 text-studio-800 dark:text-studio-200 hover:bg-studio-200 dark:hover:bg-studio-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-studio-200 dark:border-studio-700"
                        >
                            {isGenerating ? <Loader2 className="animate-spin w-3 h-3" /> : <Info className="w-3 h-3" />}
                            {t['ui.analyze']}
                        </motion.button>
                    )}
                    {analysisResult && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }}
                            className="bg-studio-50 dark:bg-studio-800 border border-studio-200 dark:border-studio-700 rounded-lg p-3 text-xs text-studio-600 dark:text-studio-300 leading-relaxed overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-studio-900 dark:text-white flex items-center gap-1"><Sparkles size={10}/> Result</span>
                                <button onClick={() => setAnalysisResult('')} className="text-studio-400 hover:text-studio-900 dark:hover:text-white"><Trash2 size={12}/></button>
                            </div>
                            {analysisResult}
                        </motion.div>
                    )}
                    </AnimatePresence>
                )}
            </div>
            )}

            {/* --- PLANTING UPLOAD UI (Duplicated logic for clarity, since Planting needs single upload too) --- */}
            {activeWorkflow === 'planting' && (
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <ImageIcon size={14} className="text-studio-600 dark:text-studio-400"/> 
                        {t['op.upload_ref']}
                    </label>
                    <div 
                        className={`group relative h-40 rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
                            ${uploadedImage 
                                ? 'border-studio-900 dark:border-white' 
                                : 'border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:border-studio-400 dark:hover:border-studio-600 hover:bg-studio-100 dark:hover:bg-studio-700'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploadedImage ? (
                            <>
                                <img src={uploadedImage} alt="Ref" className="absolute inset-0 w-full h-full object-contain p-2 z-0 opacity-80 group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-white/20 group-hover:bg-black/10 transition-colors z-10" />
                                <button className="absolute bottom-2 right-2 bg-studio-900 text-white shadow-sm px-2 py-1 rounded text-xs font-medium z-20 opacity-0 group-hover:opacity-100 transition-opacity">{t['btn.change']}</button>
                            </>
                        ) : (
                            <>
                            <div className="w-10 h-10 bg-white dark:bg-studio-700 rounded-full border border-studio-200 dark:border-studio-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform text-studio-800 dark:text-studio-200">
                                <Upload size={18} />
                            </div>
                            <span className="text-xs text-studio-500 dark:text-studio-400 font-medium">{t['ui.upload.drag']}</span>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </div>
                </div>
            )}
            
            {/* --- DETAIL WORKFLOW UI (NEW) --- */}
            {activeWorkflow === 'detail' && (
             <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                 {/* 2. Focus Selection (Upload is handled below in generic block) */}
                 <div className="space-y-3">
                     <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                        <Focus size={14} className="text-studio-600 dark:text-studio-400"/> 
                        2. Select Focus
                     </label>
                     <div className="grid grid-cols-2 gap-2">
                        {DETAIL_PRESETS.map(item => {
                            const isSelected = detailFocus.includes(item.id);
                            return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (isSelected) {
                                        setDetailFocus(prev => prev.filter(id => id !== item.id));
                                    } else {
                                        setDetailFocus(prev => [...prev, item.id]);
                                    }
                                }}
                                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all
                                    ${isSelected 
                                        ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white shadow-sm' 
                                        : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700 hover:bg-studio-50 dark:hover:bg-studio-700'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-studio-100 dark:bg-studio-700 text-studio-500 dark:text-studio-400'}`}>
                                    <item.icon size={14}/>
                                </div>
                                <div>
                                    <span className={`block text-xs font-bold ${isSelected ? 'text-studio-900 dark:text-white' : 'text-studio-700 dark:text-studio-300'}`}>{item.label}</span>
                                    <span className="text-[10px] text-studio-400 dark:text-studio-500">{item.desc}</span>
                                </div>
                                {isSelected && <div className="ml-auto text-studio-900 dark:text-white"><CheckCircle2 size={14} fill="currentColor"/></div>}
                            </button>
                        )})}
                     </div>
                 </div>
             </div>
            )}
            
            {/* ... (Existing Fusion/FaceSwap/BgSwap UI blocks remain unchanged) ... */}
            {/* --- FUSION WORKFLOW UI (UPDATED) --- */}
            {activeWorkflow === 'fusion' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                    
                    {/* A. Model Configuration */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <UserCheck size={14} className="text-studio-600 dark:text-studio-400"/> 
                            {t['op.select_model']}
                        </label>

                        {/* Model Mode Tabs */}
                        <div className="flex bg-studio-100 dark:bg-studio-800 p-1 rounded-lg">
                            <button
                                onClick={() => setFusionModelMode('attributes')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                    ${fusionModelMode === 'attributes' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}
                            >
                                Attributes
                            </button>
                            <button
                                onClick={() => setFusionModelMode('preset')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                    ${fusionModelMode === 'preset' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}
                            >
                                Preset
                            </button>
                            <button
                                onClick={() => setFusionModelMode('custom')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                    ${fusionModelMode === 'custom' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}
                            >
                                Custom
                            </button>
                        </div>
                        
                        {/* 1. Attributes Mode */}
                        {fusionModelMode === 'attributes' && (
                            <div className="bg-white dark:bg-studio-900 rounded-lg p-1 space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-studio-500 dark:text-studio-400 uppercase">Skin Tone</label>
                                    <div className="flex gap-2">
                                        {FUSION_SKIN_TONES.map(tone => (
                                            <button
                                                key={tone.id}
                                                onClick={() => setFusionSkinTone(tone.id)}
                                                className={`relative flex-1 h-8 rounded-md border transition-all ${fusionSkinTone === tone.id ? 'ring-2 ring-studio-900 dark:ring-white border-transparent' : 'border-studio-200 dark:border-studio-700'}`}
                                                style={{ backgroundColor: tone.color }}
                                                title={tone.label}
                                            >
                                            {fusionSkinTone === tone.id && <Check size={12} className="text-studio-900 absolute inset-0 m-auto"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-studio-500 dark:text-studio-400 uppercase">Body Shape</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FUSION_BODY_SHAPES.map(shape => (
                                            <button
                                                key={shape.id}
                                                onClick={() => setFusionBodyShape(shape.id)}
                                                className={`flex items-center gap-2 px-2 py-2 rounded-md border text-[10px] font-medium transition-all
                                                    ${fusionBodyShape === shape.id 
                                                        ? 'bg-studio-50 dark:bg-studio-800 border-studio-900 dark:border-white text-studio-900 dark:text-white' 
                                                        : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700 text-studio-500 dark:text-studio-400 hover:border-studio-400 dark:hover:border-studio-600'}`}
                                            >
                                                <shape.icon size={12} />
                                                {shape.label.split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Preset Mode */}
                        {fusionModelMode === 'preset' && (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-hide">
                                {PRESET_MODELS.map(model => (
                                    <div 
                                    key={model.id}
                                    onClick={() => setSelectedPresetId(model.id)}
                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                                        ${selectedPresetId === model.id ? 'border-studio-900 dark:border-white' : 'border-transparent'}`}
                                    >
                                    <img src={model.src} alt={model.label} className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] py-0.5 text-center truncate px-1 backdrop-blur-sm">
                                        {model.label}
                                    </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3. Custom Mode */}
                        {fusionModelMode === 'custom' && (
                            <div 
                                className={`relative h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden
                                    ${faceImage ? 'border-studio-900 dark:border-white bg-white dark:bg-studio-800' : 'border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:border-studio-400 dark:hover:border-studio-600'}`}
                                onClick={() => faceInputRef.current?.click()}
                            >
                                {faceImage ? (
                                    <img src={faceImage} className="w-full h-full object-contain" alt="Custom Face" />
                                ) : (
                                    <>
                                        <div className="w-8 h-8 bg-white dark:bg-studio-700 rounded-full border border-studio-200 dark:border-studio-600 flex items-center justify-center mb-1 text-studio-500 dark:text-studio-400">
                                            <UserPlus size={16} />
                                        </div>
                                        <span className="text-xs text-studio-500 dark:text-studio-400">Upload Face</span>
                                    </>
                                )}
                                <input type="file" ref={faceInputRef} className="hidden" accept="image/*" onChange={handleFaceUpload} />
                            </div>
                        )}
                    </div>

                    {/* B. Pose & Structure */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                                <Move size={14} className="text-studio-600 dark:text-studio-400"/> 
                                {t['op.select_pose']}
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFusionPoseMode('auto')}
                                    className={`px-2 py-1 text-[10px] rounded border ${fusionPoseMode === 'auto' ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 border-studio-900 dark:border-white' : 'text-studio-500 dark:text-studio-400 border-studio-200 dark:border-studio-700'}`}
                                >
                                    Auto
                                </button>
                                <button
                                    onClick={() => setFusionPoseMode('template')}
                                    className={`px-2 py-1 text-[10px] rounded border ${fusionPoseMode === 'template' ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 border-studio-900 dark:border-white' : 'text-studio-500 dark:text-studio-400 border-studio-200 dark:border-studio-700'}`}
                                >
                                    Template
                                </button>
                            </div>
                        </div>
                        
                        {fusionPoseMode === 'auto' ? (
                            <div className="p-3 bg-studio-50 dark:bg-studio-800 rounded-lg text-xs text-studio-500 dark:text-studio-400 border border-studio-100 dark:border-studio-700 flex items-center gap-2">
                                <Wand size={14} />
                                AI will automatically infer body.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                                {POSE_PRESETS['body_pose'].map(pose => (
                                    <button
                                        key={pose.id}
                                        onClick={() => setFusionSelectedPoseId(pose.id)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all
                                            ${fusionSelectedPoseId === pose.id ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white' : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700 hover:bg-studio-50 dark:hover:bg-studio-700'}`}
                                    >
                                        <pose.icon size={14} className="text-studio-600 dark:text-studio-400"/>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-studio-800 dark:text-studio-200 truncate">{pose.label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* C. Scene */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <Palette size={14} className="text-studio-600 dark:text-studio-400"/> 
                            {t['op.select_scene']}
                        </label>
                        
                        <div className="flex bg-studio-100 dark:bg-studio-800 p-1 rounded-lg">
                            <button onClick={() => setFusionSceneMode('white')} className={`flex-1 py-1.5 text-[10px] font-medium rounded-md ${fusionSceneMode === 'white' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}>White</button>
                            <button onClick={() => setFusionSceneMode('template')} className={`flex-1 py-1.5 text-[10px] font-medium rounded-md ${fusionSceneMode === 'template' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}>Library</button>
                            <button onClick={() => setFusionSceneMode('custom')} className={`flex-1 py-1.5 text-[10px] font-medium rounded-md ${fusionSceneMode === 'custom' ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' : 'text-studio-500 dark:text-studio-400'}`}>Custom</button>
                        </div>

                        {fusionSceneMode === 'template' && (
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                                {SCENE_PRESETS['studio'].map(scene => (
                                    <button
                                        key={scene.id}
                                        onClick={() => setFusionSelectedSceneId(scene.id)}
                                        className={`h-10 px-2 rounded-lg border flex items-center gap-2 text-left transition-all
                                            ${fusionSelectedSceneId === scene.id ? 'bg-white dark:bg-studio-800 border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white' : 'bg-white dark:bg-studio-800 border-studio-200 dark:border-studio-700'}`}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-studio-100 dark:bg-studio-700 flex items-center justify-center text-studio-600 dark:text-studio-400 shrink-0"><scene.icon size={10}/></div>
                                        <span className="text-[10px] font-medium truncate text-studio-800 dark:text-studio-200">{scene.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        {fusionSceneMode === 'custom' && (
                            <div 
                                className={`relative h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                                    ${fusionCustomSceneImg ? 'border-studio-900 dark:border-white' : 'border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800'}`}
                                onClick={() => sceneInputRef.current?.click()}
                            >
                                {fusionCustomSceneImg ? (
                                    <img src={fusionCustomSceneImg} className="w-full h-full object-cover rounded-md" alt="Custom Scene" />
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon size={16} className="mx-auto text-studio-400 dark:text-studio-500 mb-1"/>
                                        <span className="text-[10px] text-studio-500 dark:text-studio-400">Upload Background</span>
                                    </div>
                                )}
                                <input type="file" ref={sceneInputRef} className="hidden" accept="image/*" onChange={handleSceneUpload} />
                            </div>
                        )}
                    </div>

                    {/* D. Composition & Crop (Reuse) */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <MonitorPlay size={14} className="text-studio-600 dark:text-studio-400"/> 
                            Crop
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {FUSION_CROPS.map(crop => (
                                <button
                                    key={crop.id}
                                    onClick={() => setFusionComposition(crop.id)}
                                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all gap-1 h-14
                                        ${fusionComposition === crop.id 
                                            ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 border-studio-900 dark:border-white' 
                                            : 'bg-white dark:bg-studio-800 text-studio-600 dark:text-studio-300 border-studio-200 dark:border-studio-700 hover:border-studio-300 dark:hover:border-studio-600'}`}
                                >
                                    <crop.icon size={14} />
                                    <span className="text-[10px] font-bold">{crop.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            )}

            {/* --- BACKGROUND SWAP SPECIFIC UI --- */}
            {activeWorkflow === 'bg_swap' && (
                <div className="space-y-6">
                    
                    {/* A. Scene Library */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                                <Palette size={14} className="text-studio-600 dark:text-studio-400"/> 
                                {t['op.select_scene']}
                            </label>
                            
                            {/* Integrated Quantity Selector for BG Swap - REPLACED WITH SELECTION COUNT */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-studio-400 dark:text-studio-500 font-medium">
                                    Selected: <span className="text-studio-900 dark:text-white font-bold">{selectedSceneIds.length}</span>
                                </span>
                            </div>
                        </div>
                        
                        {/* Category Grid - Improved Layout */}
                        <div className="grid grid-cols-4 gap-1.5 bg-studio-50 dark:bg-studio-800 p-1.5 rounded-xl border border-studio-100 dark:border-studio-700">
                            {SCENE_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSceneCategory(cat.id)}
                                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all
                                        ${sceneCategory === cat.id 
                                            ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm border border-studio-200/50 dark:border-studio-600' 
                                            : 'text-studio-500 dark:text-studio-400 hover:bg-studio-100 dark:hover:bg-studio-700 hover:text-studio-700 dark:hover:text-studio-200'}`}
                                >
                                    <cat.icon size={16} strokeWidth={1.5} />
                                    <span className="text-[9px] font-medium leading-tight text-center whitespace-nowrap">{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Scene Grid - Module Style */}
                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                            {SCENE_PRESETS[sceneCategory]?.map(scene => {
                                const isSelected = selectedSceneIds.includes(scene.id);
                                return (
                                    <button
                                        key={scene.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedSceneIds(prev => prev.filter(id => id !== scene.id));
                                            } else {
                                                setSelectedSceneIds(prev => [...prev, scene.id]);
                                            }
                                        }}
                                        className={`relative h-20 rounded-xl border transition-all overflow-hidden group flex items-center p-3 gap-3 text-left
                                            ${isSelected ? 'border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white bg-white dark:bg-studio-800 shadow-md' : 'border-transparent bg-studio-50 dark:bg-studio-800 hover:border-studio-300 dark:hover:border-studio-600 hover:bg-white dark:hover:bg-studio-700'}`}
                                        style={{ 
                                            background: isSelected ? undefined : `linear-gradient(to right, ${scene.color}cc, transparent 90%)` 
                                        }}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-studio-800 dark:text-studio-200 shadow-sm transition-colors
                                            ${isSelected ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-white/80 dark:bg-studio-700'}`}>
                                            <scene.icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className={`block text-xs font-bold truncate ${isSelected ? 'text-studio-900 dark:text-white' : 'text-studio-800 dark:text-studio-200'}`}>{scene.label}</span>
                                            <span className="block text-[9px] opacity-70 truncate text-studio-600 dark:text-studio-400">{scene.desc}</span>
                                        </div>
                                        {isSelected && <div className="absolute top-2 right-2 text-studio-900 dark:text-white"><CheckCircle2 size={14} fill="currentColor"/></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* B. Lighting & Blur Controls */}
                    <div className="space-y-4 pt-2 border-t border-studio-100 dark:border-studio-800">
                        {/* Lighting */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-studio-500 dark:text-studio-400 flex items-center gap-1"><Sun size={10}/> Lighting</label>
                            <div className="grid grid-cols-4 gap-2">
                                {LIGHTING_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setBgLighting(opt.id)}
                                        className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all
                                            ${bgLighting === opt.id 
                                                ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 border-studio-900 dark:border-white' 
                                                : 'bg-white dark:bg-studio-800 text-studio-500 dark:text-studio-400 border-studio-200 dark:border-studio-700 hover:border-studio-300 dark:hover:border-studio-600'}`}
                                    >
                                        <opt.icon size={14} />
                                        <span className="text-[9px] font-medium">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Blur Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-medium text-studio-600 dark:text-studio-300">
                                <span className="flex items-center gap-1"><Aperture size={10}/> Bokeh</span>
                                <span className="text-studio-900 dark:text-white">f/{bgBlur > 60 ? '1.4' : bgBlur > 30 ? '2.8' : bgBlur > 0 ? '5.6' : '11'}</span>
                            </div>
                            <input 
                                type="range" min={0} max={100} step={10}
                                value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))}
                                className="w-full h-1.5 bg-studio-200 dark:bg-studio-700 rounded-full appearance-none cursor-pointer accent-studio-900 dark:accent-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Face Swap Specific Inputs - REDESIGNED */}
            {activeWorkflow === 'face_swap' && (
                <div className="space-y-6">
                    
                    {/* A. Mode Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <ScanFace size={14} className="text-studio-600 dark:text-studio-400"/> 
                            2. Select Mode
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'model_swap', label: 'Model', sub: 'Body Swap', icon: UserCheck },
                                { id: 'head_swap', label: 'Head', sub: 'Head Swap', icon: UserCog },
                                { id: 'face_swap', label: 'Face', sub: 'Face Only', icon: ScanFace },
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setFaceSwapMode(mode.id as FaceSwapMode)}
                                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-lg border transition-all gap-1.5
                                        ${faceSwapMode === mode.id 
                                            ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 border-studio-900 dark:border-white shadow-md transform scale-[1.02]' 
                                            : 'bg-white dark:bg-studio-800 text-studio-600 dark:text-studio-300 border-studio-200 dark:border-studio-700 hover:border-studio-300 dark:hover:border-studio-600 hover:bg-studio-50 dark:hover:bg-studio-700'}`}
                                >
                                    <mode.icon size={20} className={faceSwapMode === mode.id ? 'text-white dark:text-studio-900' : 'text-studio-500 dark:text-studio-400'}/>
                                    <div className="text-center">
                                        <span className="block text-xs font-bold">{mode.label}</span>
                                        <span className={`block text-[9px] ${faceSwapMode === mode.id ? 'text-studio-300 dark:text-studio-600' : 'text-studio-400 dark:text-studio-500'}`}>{mode.sub}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* B. Source Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <User size={14} className="text-studio-600 dark:text-studio-400"/> 
                            3. Select Source
                        </label>
                        
                        {/* Source Tabs */}
                        <div className="flex bg-studio-100 dark:bg-studio-800 p-1 rounded-lg">
                            {[
                                { id: 'preset', label: 'Preset' },
                                { id: 'fixed', label: 'Brand' },
                                { id: 'custom', label: 'Custom' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFaceModelSource(tab.id as FaceModelSource)}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all
                                        ${faceModelSource === tab.id 
                                            ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 shadow-sm' 
                                            : 'text-studio-500 dark:text-studio-400 hover:text-studio-700 dark:hover:text-studio-200'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Source Content Area */}
                        <div className="bg-white dark:bg-studio-900 rounded-lg p-1">
                            {/* Preset Models Grid */}
                            {faceModelSource === 'preset' && (
                                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-hide">
                                    {PRESET_MODELS.map(model => (
                                        <div 
                                            key={model.id}
                                            onClick={() => setSelectedPresetId(model.id)}
                                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group
                                                ${selectedPresetId === model.id ? 'border-studio-900 dark:border-white' : 'border-transparent'}`}
                                        >
                                            <img src={model.src} alt={model.label} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            <div className="absolute bottom-0 w-full bg-black/60 text-white text-[9px] py-0.5 text-center truncate px-1 backdrop-blur-sm">
                                                {model.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Fixed Models Grid */}
                            {faceModelSource === 'fixed' && (
                                <div className="grid grid-cols-3 gap-2 p-1">
                                    {FIXED_MODELS.map(model => (
                                        <div 
                                            key={model.id}
                                            onClick={() => setSelectedPresetId(model.id)}
                                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all
                                                ${selectedPresetId === model.id ? 'border-studio-900 dark:border-white' : 'border-transparent'}`}
                                        >
                                            <img src={model.src} alt={model.label} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 w-full bg-indigo-900/80 text-white text-[9px] py-0.5 text-center truncate px-1">
                                                {model.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Custom Upload */}
                            {faceModelSource === 'custom' && (
                                <div 
                                    className={`relative h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden
                                        ${faceImage ? 'border-studio-900 dark:border-white bg-white dark:bg-studio-800' : 'border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 hover:border-studio-400 dark:hover:border-studio-600'}`}
                                    onClick={() => faceInputRef.current?.click()}
                                >
                                    {faceImage ? (
                                        <img src={faceImage} className="w-full h-full object-contain" alt="Custom Face" />
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 bg-white dark:bg-studio-700 rounded-full border border-studio-200 dark:border-studio-600 flex items-center justify-center mb-1 text-studio-500 dark:text-studio-400">
                                                <UserPlus size={16} />
                                            </div>
                                            <span className="text-xs text-studio-500 dark:text-studio-400">Upload Face</span>
                                        </>
                                    )}
                                    <input type="file" ref={faceInputRef} className="hidden" accept="image/*" onChange={handleFaceUpload} />
                                    {faceImage && <button className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm text-studio-500 hover:text-red-500"><Trash2 size={12}/></button>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* C. Advanced Controls (Similarity & Attributes) */}
                    <div className="space-y-4 pt-2 border-t border-studio-100 dark:border-studio-800">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-medium text-studio-600 dark:text-studio-300">
                                <span>Similarity</span>
                                <span className="text-studio-900 dark:text-white">{faceSimilarity}%</span>
                            </div>
                            <input 
                                type="range" min={50} max={100} step={1}
                                value={faceSimilarity} onChange={(e) => setFaceSimilarity(Number(e.target.value))}
                                className="w-full h-1.5 bg-studio-200 dark:bg-studio-700 rounded-full appearance-none cursor-pointer accent-studio-900 dark:accent-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Pose Selection (Fission Only) - REFACTORED */}
            {activeWorkflow === 'fission' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                            <Move size={14} className="text-studio-600 dark:text-studio-400"/> 
                            2. Target Poses
                        </label>
                        <div className="flex gap-2">
                            <select 
                                value={modelStyle} onChange={(e) => setModelStyle(e.target.value)}
                                className="text-[10px] p-1 rounded border border-studio-200 dark:border-studio-700 bg-white dark:bg-studio-800 text-studio-900 dark:text-white outline-none"
                            >
                                {MODEL_STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Upload Custom Pose Card - Always visible first */}
                    <div 
                        onClick={() => togglePose('custom_upload')}
                        className={`w-full h-16 rounded-lg border border-dashed flex items-center justify-between px-4 cursor-pointer transition-all relative overflow-hidden group
                            ${selectedPoses.includes('custom_upload') ? 'border-studio-900 dark:border-white bg-studio-50 dark:bg-studio-800 ring-1 ring-studio-900/20 dark:ring-white/20' : 'border-studio-300 dark:border-studio-600 hover:border-studio-400 dark:hover:border-studio-500 hover:bg-studio-50 dark:hover:bg-studio-800'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedPoses.includes('custom_upload') ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-studio-100 dark:bg-studio-700 text-studio-500 dark:text-studio-400'}`}>
                                <Upload size={14} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-studio-900 dark:text-white">Custom Pose</span>
                                <span className="text-[10px] text-studio-500 dark:text-studio-400">Upload Skeleton</span>
                            </div>
                        </div>
                        
                        {customPoseImage && (
                            <img src={customPoseImage} className="h-12 w-12 object-cover rounded border border-studio-200 dark:border-studio-700" alt="Custom" />
                        )}
                        
                        <input type="file" ref={poseInputRef} className="hidden" onChange={handlePoseUpload} />
                        {selectedPoses.includes('custom_upload') && <div className="text-studio-900 dark:text-white"><CheckCircle2 size={16} fill="currentColor"/></div>}
                    </div>

                    {/* Category Tabs */}
                    <div className="flex bg-studio-100 dark:bg-studio-800 p-1 rounded-lg">
                        {POSE_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setPoseCategory(cat.id)}
                                className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-md transition-all
                                    ${poseCategory === cat.id 
                                        ? 'bg-white dark:bg-studio-700 text-studio-900 dark:text-white shadow-sm' 
                                        : 'text-studio-500 dark:text-studio-400 hover:text-studio-700 dark:hover:text-studio-200'}`}
                            >
                                <cat.icon size={12} />
                                <span className="text-[10px] font-medium">{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Pose Grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                        {POSE_PRESETS[poseCategory]?.map(pose => (
                            <div 
                                key={pose.id}
                                onClick={() => togglePose(pose.id)}
                                className={`relative h-[72px] rounded-xl border transition-all cursor-pointer flex items-center p-2.5 gap-2.5 overflow-hidden group
                                    ${selectedPoses.includes(pose.id) ? 'border-studio-900 dark:border-white ring-1 ring-studio-900 dark:ring-white bg-white dark:bg-studio-800 shadow-md' : 'border-transparent bg-studio-50 dark:bg-studio-800 hover:border-studio-300 dark:hover:border-studio-600 hover:bg-studio-white dark:hover:bg-studio-700'}`}
                                style={{ 
                                    background: selectedPoses.includes(pose.id) ? undefined : `linear-gradient(to right, ${pose.color}cc, transparent 90%)` 
                                }}
                            >
                                {/* Icon Box */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors shrink-0
                                    ${selectedPoses.includes(pose.id) ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900' : 'bg-white/80 dark:bg-studio-700 text-studio-800 dark:text-studio-200'}`}>
                                    <pose.icon size={14} />
                                </div>
                                
                                {/* Text Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <span className={`block text-[11px] font-bold truncate ${selectedPoses.includes(pose.id) ? 'text-studio-900 dark:text-white' : 'text-studio-800 dark:text-studio-200'}`}>{pose.label}</span>
                                    <span className="block text-[9px] opacity-70 truncate text-studio-600 dark:text-studio-400">{pose.desc}</span>
                                </div>

                                {selectedPoses.includes(pose.id) && (
                                    <div className="absolute top-2 right-2 text-studio-900 dark:text-white">
                                        <CheckCircle2 size={12} fill="currentColor" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
        )}

        {/* 4. Prompt Input */}
        <div className="space-y-3">
             <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-studio-800 dark:text-studio-200 flex items-center gap-2">
                    <Hash size={14} className="text-studio-600 dark:text-studio-400"/> 
                    {t['op.prompt_label']}
                 </label>
                 <button 
                    onClick={handleSmartEnhance} disabled={isEnhancing || !prompt}
                    className="text-[10px] flex items-center gap-1 text-studio-500 dark:text-studio-400 hover:text-studio-900 dark:hover:text-white disabled:opacity-50 transition-colors bg-studio-50 dark:bg-studio-800 px-2 py-1 rounded-full border border-studio-200 dark:border-studio-700"
                 >
                    {isEnhancing ? <Loader2 className="animate-spin w-3 h-3"/> : <Wand2 size={10}/>}
                    {t['btn.smart_enhance']}
                 </button>
             </div>
             
             {/* Only show prompt area if not custom extraction mode (which has its own large area) */}
             {!(activeWorkflow === 'extraction' && extractMode === 'custom') && (
                 <div className="relative">
                     <textarea 
                        value={prompt} onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe additional details..."
                        className="w-full h-24 p-3 rounded-lg border border-studio-200 dark:border-studio-700 bg-studio-50 dark:bg-studio-800 text-sm placeholder:text-studio-400 dark:placeholder:text-studio-500 text-studio-900 dark:text-white focus:ring-1 focus:ring-studio-900 dark:focus:ring-white focus:bg-white dark:focus:bg-studio-900 transition-all outline-none resize-none"
                     />
                 </div>
             )}
             
             {/* Magic Tags (Spells) */}
             {activeWorkflow === 'fusion' && (
                 <div className="flex flex-wrap gap-1.5">
                     {MAGIC_TAGS.map(tag => (
                         <button
                             key={tag.id}
                             onClick={() => setPrompt(p => p.includes(tag.label) ? p : `${p} ${tag.label},`.trim())}
                             className="text-[10px] px-2 py-1 bg-studio-100 dark:bg-studio-800 hover:bg-studio-200 dark:hover:bg-studio-700 text-studio-600 dark:text-studio-300 rounded-full transition-colors"
                         >
                             {tag.label}
                         </button>
                     ))}
                 </div>
             )}
        </div>

        {/* 5. Settings (Platform / Quantity / Resolution) */}
        <div className="space-y-4 pt-4 border-t border-studio-100 dark:border-studio-800">
            {/* Row 1: Platform & Quantity */}
            <div className={`grid ${activeWorkflow !== 'fission' && activeWorkflow !== 'bg_swap' && activeWorkflow !== 'agent_batch' && activeWorkflow !== 'extraction' && activeWorkflow !== 'detail' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                 <div className="space-y-1.5">
                     <label className="text-[11px] font-semibold text-studio-500 dark:text-studio-400 flex items-center gap-1"><ShoppingBag size={12}/> {t['op.platform']}</label>
                     <div className="relative">
                         <select 
                             value={selectedPlatform} 
                             onChange={(e) => handlePlatformChange(e.target.value)}
                             className="w-full h-9 pl-2 pr-6 text-xs bg-white dark:bg-studio-800 border border-studio-200 dark:border-studio-700 text-studio-900 dark:text-white rounded-lg outline-none focus:border-studio-900 dark:focus:border-white appearance-none"
                         >
                             {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                         </select>
                         <ChevronDown className="absolute right-2 top-2.5 text-studio-400 dark:text-studio-500 pointer-events-none" size={14} />
                     </div>
                 </div>

                 {activeWorkflow !== 'fission' && activeWorkflow !== 'bg_swap' && activeWorkflow !== 'agent_batch' && activeWorkflow !== 'extraction' && activeWorkflow !== 'detail' && (
                     <div className="space-y-1.5">
                         <label className="text-[11px] font-semibold text-studio-500 dark:text-studio-400 flex items-center gap-1"><Hash size={12}/> {t['op.quantity']}</label>
                         <div className="relative">
                             <select 
                                 value={quantity} 
                                 onChange={(e) => setQuantity(Number(e.target.value))}
                                 className="w-full h-9 pl-2 pr-6 text-xs bg-white dark:bg-studio-800 border border-studio-200 dark:border-studio-700 text-studio-900 dark:text-white rounded-lg outline-none focus:border-studio-900 dark:focus:border-white appearance-none"
                             >
                                 {QUANTITY_OPTIONS.map(n => <option key={n} value={n}>{n} x</option>)}
                             </select>
                             <ChevronDown className="absolute right-2 top-2.5 text-studio-400 dark:text-studio-500 pointer-events-none" size={14} />
                         </div>
                     </div>
                 )}
            </div>

            {/* Row 2: Resolution */}
            <div className="space-y-1.5">
                 <label className="text-[11px] font-semibold text-studio-500 dark:text-studio-400 flex items-center gap-1"><Maximize size={12}/> {t['op.resolution']}</label>
                 <div className="grid grid-cols-3 gap-2">
                     {(['1K', '2K', '4K'] as ImageSize[]).map(size => (
                         <button
                             key={size}
                             onClick={() => setImageSize(size)}
                             className={`h-8 text-xs font-medium rounded-lg border transition-all
                                 ${imageSize === size 
                                     ? 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 border-studio-900 dark:border-white shadow-sm' 
                                     : 'bg-white dark:bg-studio-800 text-studio-600 dark:text-studio-300 border-studio-200 dark:border-studio-700 hover:border-studio-300 dark:hover:border-studio-600'}`}
                         >
                             {size}
                         </button>
                     ))}
                 </div>
            </div>
        </div>

      </div>

      {/* Footer / Action */}
      <div className="p-6 border-t border-studio-100 dark:border-studio-800 bg-white/95 dark:bg-studio-900/95 backdrop-blur-sm z-20 transition-colors duration-300">
        <button
          onClick={handleGenerate}
          disabled={isButtonDisabled}
          className="w-full h-12 bg-studio-900 dark:bg-white hover:bg-black dark:hover:bg-studio-200 text-white dark:text-studio-900 rounded-xl font-bold text-sm shadow-lg shadow-studio-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              {activeWorkflow === 'agent_batch' ? t['ui.generating'] : t['ui.generating']}
            </>
          ) : (
             <>
             {activeWorkflow === 'detail' && <ZoomIn size={18} />}
             {activeWorkflow === 'planting' && <Sprout size={18} />}
             {activeWorkflow === 'agent_batch' && <Bot size={18} />}
             {activeWorkflow === 'fission' && <Layers size={18} />}
             {activeWorkflow === 'fusion' && <CheckCircle2 size={18} />}
             {activeWorkflow === 'face_swap' && <UserCheck size={18} />}
             {activeWorkflow === 'bg_swap' && <ImageIcon size={18} />}
             {activeWorkflow === 'extraction' && <ScanLine size={18} />}
             {activeWorkflow === 'creative' && <Wand2 size={18} />}
             <span>
                {t['ui.generate']}
             </span>
             </>
          )}
        </button>
      </div>
    </div>
  );
};
