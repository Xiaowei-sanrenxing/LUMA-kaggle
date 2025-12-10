
import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { 
    Bot, Layers, Users, Image as ImageIcon, 
    ArrowRight, CheckCircle2, 
    Combine, Scan, Zap, Aperture, Sparkles, MoveHorizontal,
    Star, Globe, ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../store';
import { WorkflowType } from '../types';
import { translations, TranslationKey } from '../utils/i18n';

// --- Assets & Constants ---
// Reliable Unsplash IDs for high availability
const COMPARE_BEFORE = "https://images.unsplash.com/photo-1550614000-4b9519e0233e?w=800&q=80"; // Mannequin / Flat / Simple
const COMPARE_AFTER = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80"; // Fashion Model

// Curated list of high-quality, reliable fashion images
const MARQUEE_IMAGES = [
    "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550614000-48ec23202550?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=600&h=800&fit=crop&q=80",
    "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=600&h=800&fit=crop&q=80",
];

// Curated list of high-quality Wedding & Bridal images
const WEDDING_IMAGES = [
    "https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=600&h=800&fit=crop&q=80", // Bride portrait
    "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&h=800&fit=crop&q=80", // Dress detail
    "https://images.unsplash.com/photo-1546193430-c2d207739ed7?w=600&h=800&fit=crop&q=80", // Ceremony setting
    "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&h=800&fit=crop&q=80", // Bridal shoes/accessories
    "https://images.unsplash.com/photo-1596386461350-326e974853b6?w=600&h=800&fit=crop&q=80", // Elegant dress
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop&q=80", // Wedding atmosphere
    "https://images.unsplash.com/photo-1550525811-e5869dd03032?w=600&h=800&fit=crop&q=80", // White texture
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&h=800&fit=crop&q=80", // Luxury details
];

// --- Sub Components ---

const Logo = ({ light = false }: { light?: boolean }) => (
  <div className="flex items-center gap-3 group cursor-pointer select-none">
    <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg transition-all duration-500 group-hover:scale-105 ${light ? 'bg-white text-studio-900' : 'bg-studio-900 text-white shadow-studio-900/20 group-hover:shadow-studio-900/40'}`}>
       <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
       <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.6, ease: "easeOut" }}>
         <Aperture size={20} strokeWidth={2} />
       </motion.div>
    </div>
    <div className="flex flex-col">
      <span className={`text-lg font-bold tracking-tight leading-none transition-colors ${light ? 'text-white' : 'text-studio-900 group-hover:text-indigo-600'}`}>LUMA</span>
      <span className={`text-[8px] font-bold tracking-[0.2em] uppercase leading-none mt-1 ${light ? 'text-white/60' : 'text-studio-400'}`}>Visual Engine</span>
    </div>
  </div>
);

// Interactive Comparison Slider
const ComparisonSlider = () => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
            setSliderPosition(percent);
        }
    };

    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isDragging) handleMove(e.clientX);
        };
        const handleGlobalMouseUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging]);

    return (
        <div 
            ref={containerRef}
            className="relative w-full aspect-[4/5] md:aspect-[3/2] lg:aspect-[16/10] rounded-2xl overflow-hidden cursor-ew-resize select-none shadow-2xl ring-1 ring-studio-900/5 group"
            onMouseMove={(e) => !isDragging && handleMove(e.clientX)}
        >
            {/* Image 2 (After) - Underlying */}
            <div className="absolute inset-0">
                <img src={COMPARE_AFTER} alt="After" className="w-full h-full object-cover" />
                <div 
                    className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 transition-opacity duration-200"
                    style={{ opacity: sliderPosition > 85 ? 0 : 1 }}
                >
                    AI Generated After
                </div>
            </div>

            {/* Image 1 (Before) - Overlying with Clip Path */}
            <div 
                className="absolute inset-0 w-full h-full"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
            >
                <img src={COMPARE_BEFORE} alt="Before" className="w-full h-full object-cover" />
                <div 
                    className="absolute top-4 left-4 bg-white/80 backdrop-blur-md text-studio-900 px-3 py-1 rounded-full text-xs font-bold border border-studio-200 transition-opacity duration-200"
                    style={{ opacity: sliderPosition < 15 ? 0 : 1 }}
                >
                    Original Before
                </div>
            </div>

            {/* Slider Handle */}
            <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 active:scale-95 text-studio-900">
                    <MoveHorizontal size={16} />
                </div>
            </div>
        </div>
    );
};

interface MarqueeProps {
    images: string[];
    direction?: 'left' | 'right';
    speed?: number;
}

// Infinite Marquee
const Marquee = ({ images, direction = 'left', speed = 40 }: MarqueeProps) => {
    return (
        <div className="w-full overflow-hidden relative group">
            <div className="absolute inset-y-0 left-0 w-20 md:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-20 md:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            
            <motion.div 
                className="flex gap-4 w-max"
                initial={{ x: direction === 'left' ? "0%" : "-50%" }}
                animate={{ x: direction === 'left' ? "-50%" : "0%" }}
                transition={{ repeat: Infinity, ease: "linear", duration: speed }}
            >
                {/* Tripled list for smoother infinite loop on wider screens */}
                {[...images, ...images, ...images].map((src, i) => (
                    <div key={i} className="w-[150px] md:w-[200px] h-[200px] md:h-[280px] rounded-xl overflow-hidden shrink-0 border border-studio-100 shadow-sm relative group/item bg-studio-100">
                        <div className="absolute inset-0 bg-studio-100" />
                        <img 
                            src={src} 
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110 relative z-10" 
                            alt={`Gallery item ${i}`}
                            onError={(e) => {
                                // Fallback if image fails
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.style.display = 'none';
                            }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors z-20" />
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

// --- Updated Feature Card (Google Labs Style) ---
const FeatureCard = ({ 
    title, desc, icon: Icon, bgColor, shapeClass, onClick, delay, tag
}: { 
    title: string, desc: string, icon: any, bgColor: string, shapeClass: string, onClick: () => void, delay: number, tag?: string
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    return (
        <motion.div 
            ref={ref}
            initial={{ y: 30, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay }}
            onClick={onClick}
            className={`relative group overflow-hidden rounded-[40px] cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${bgColor} h-[440px] shadow-sm hover:shadow-xl`}
        >
            {/* Visual Area (Top) */}
            <div className="flex-1 flex items-center justify-center p-8 relative">
                {/* Geometric Shape Container */}
                <div className={`relative flex items-center justify-center text-studio-900 shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${shapeClass}`}>
                     <Icon size={48} strokeWidth={1.5} />
                     {tag && (
                         <span className="absolute -top-3 -right-3 bg-white text-studio-900 text-[10px] font-bold px-2 py-1 rounded-full border border-black/10 shadow-sm whitespace-nowrap">
                             {tag}
                         </span>
                     )}
                </div>
            </div>

            {/* Content Area (Bottom) */}
            <div className="p-8 pt-0 flex flex-col">
                <h3 className="text-2xl font-bold text-studio-900 mb-3 leading-tight tracking-tight">{title}</h3>
                <p className="text-sm font-medium text-studio-900/70 mb-8 leading-relaxed line-clamp-3">{desc}</p>
                
                <div className="mt-auto">
                    <button className="px-6 py-2.5 rounded-full border border-studio-900/20 bg-white/10 backdrop-blur-sm text-studio-900 text-sm font-bold group-hover:bg-studio-900 group-hover:text-white transition-all flex items-center w-max gap-2">
                        Create <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// --- Main Page Component ---

export const HomePage: React.FC = () => {
    const { setWorkflow, language } = useAppStore();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
    const t = translations[language];

    const handleStart = (wf: WorkflowType) => {
        setWorkflow(wf);
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA] text-studio-900 font-sans selection:bg-studio-900 selection:text-white overflow-x-hidden">
            
            {/* Progress Bar */}
            <motion.div className="fixed top-0 left-0 right-0 h-1 bg-indigo-600 origin-left z-[100]" style={{ scaleX }} />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-studio-100 h-20 flex items-center justify-between px-6 lg:px-12 transition-all">
                <Logo />
                
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-8 mr-4 text-sm font-medium text-studio-500">
                        <a href="#" className="hover:text-studio-900 transition-colors">Showcase</a>
                        <a href="#" className="hover:text-studio-900 transition-colors">Pricing</a>
                        <a href="#" className="hover:text-studio-900 transition-colors">API</a>
                    </div>
                    <button 
                        onClick={() => handleStart('agent_batch')}
                        className="px-6 py-2.5 bg-studio-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-studio-900/20 flex items-center gap-2 group"
                    >
                        {t['home.btn.start_agent']}
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-20 px-6 lg:px-12 max-w-[1400px] mx-auto">
                {/* Background Decor */}
                <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                     <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
                     <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
                     {/* Grid Pattern */}
                     <div 
                        className="absolute inset-0 opacity-[0.4]"
                        style={{
                            backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                            backgroundSize: '30px 30px',
                            maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)'
                        }}
                     />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Text */}
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-studio-200 text-studio-600 text-[10px] font-bold tracking-wider uppercase mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <Sparkles size={12} className="text-indigo-500" />
                            LUMA Engine V2.17 Now Live
                        </div>
                        
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 text-studio-900 leading-[1.05]">
                            {t['home.hero.title_p1']}<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                                {t['home.hero.title_p2']}
                            </span>
                        </h1>
                        <h2 className="text-2xl lg:text-4xl font-bold tracking-tight mb-4 text-studio-300 leading-[1.05]">
                            {t['home.hero.subtitle']}
                        </h2>
                        
                        <p className="text-lg text-studio-500 max-w-xl mb-10 leading-relaxed font-medium">
                            {t['home.hero.desc']}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <button 
                                onClick={() => handleStart('agent_batch')}
                                className="w-full sm:w-auto px-8 py-4 bg-studio-900 text-white text-sm font-bold rounded-2xl hover:bg-black transition-all hover:scale-105 shadow-xl shadow-studio-900/30 flex items-center justify-center gap-2"
                            >
                                <Bot size={20} />
                                {t['home.btn.start_agent']}
                            </button>
                            <button 
                                onClick={() => handleStart('creative')}
                                className="w-full sm:w-auto px-8 py-4 bg-white text-studio-900 border border-studio-200 text-sm font-bold rounded-2xl hover:bg-studio-50 transition-all hover:border-studio-300 flex items-center justify-center gap-2 shadow-sm"
                            >
                                {t['home.btn.demo']}
                            </button>
                        </div>
                        
                        <div className="mt-12 flex items-center gap-8 text-xs font-semibold text-studio-400">
                             <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Free Trial</div>
                             <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> 4K Ultra-HD</div>
                             <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Commercial License</div>
                        </div>
                    </motion.div>

                    {/* Right: Visual */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="relative"
                    >
                         <div className="relative z-10">
                             <ComparisonSlider />
                         </div>
                         {/* Abstract BG shapes behind slider */}
                         <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl z-0" />
                         <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl z-0" />
                    </motion.div>
                </div>
            </header>

            {/* Marquee Section */}
            <section className="py-12 bg-white space-y-6">
                 <div className="text-center mb-8">
                     <p className="text-xs font-bold text-studio-400 uppercase tracking-widest">Generated with LUMA</p>
                 </div>
                 <Marquee images={MARQUEE_IMAGES} direction="left" speed={45} />
                 <Marquee images={WEDDING_IMAGES} direction="right" speed={55} />
            </section>

            {/* Features Grid (Google Labs Style) */}
            <section className="py-24 px-6 lg:px-12 max-w-[1400px] mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-20">
                     <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-studio-900 tracking-tight">{t['home.features.title']}</h2>
                     <p className="text-lg text-studio-500 leading-relaxed">{t['home.features.subtitle']}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 1. Agent Batch */}
                    <FeatureCard 
                        title={t['tool.agent_batch.label']}
                        desc={t['tool.agent_batch.desc']}
                        icon={Bot}
                        bgColor="bg-[#A0C4FF]"
                        shapeClass="w-32 h-32 bg-white rounded-[2.5rem]"
                        onClick={() => handleStart('agent_batch')}
                        delay={0}
                        tag="AUTOMATED"
                    />

                    {/* 2. Mannequin Fusion */}
                    <FeatureCard 
                        title={t['tool.fusion.label']}
                        desc={t['tool.fusion.desc']}
                        icon={Combine}
                        bgColor="bg-[#FFC6FF]"
                        shapeClass="w-36 h-32 bg-white rounded-[40%_60%_70%_30%_/_40%_50%_60%_50%]"
                        onClick={() => handleStart('fusion')}
                        delay={0.1}
                    />

                    {/* 3. Face Swap */}
                    <FeatureCard 
                        title={t['tool.face_swap.label']}
                        desc={t['tool.face_swap.desc']}
                        icon={Users}
                        bgColor="bg-[#9BF6FF]"
                        shapeClass="w-40 h-28 bg-white rounded-full"
                        onClick={() => handleStart('face_swap')}
                        delay={0.2}
                    />

                    {/* 4. Scene Reconstruction */}
                    <FeatureCard 
                        title={t['tool.bg_swap.label']}
                        desc={t['tool.bg_swap.desc']}
                        icon={ImageIcon}
                        bgColor="bg-[#FFD6A5]"
                        shapeClass="w-32 h-32 bg-white rounded-full"
                        onClick={() => handleStart('bg_swap')}
                        delay={0.3}
                    />

                     {/* 5. Fission */}
                     <FeatureCard 
                        title={t['tool.fission.label']}
                        desc={t['tool.fission.desc']}
                        icon={Layers}
                        bgColor="bg-[#CAFFBF]"
                        shapeClass="w-32 h-32 bg-white rounded-[1rem] rotate-3"
                        onClick={() => handleStart('fission')}
                        delay={0.4}
                    />

                    {/* 6. Product Extraction */}
                    <FeatureCard 
                        title={t['tool.extraction.label']}
                        desc={t['tool.extraction.desc']}
                        icon={Scan}
                        bgColor="bg-[#BDB2FF]"
                        shapeClass="w-32 h-32 bg-white rounded-2xl rotate-45 scale-75"
                        onClick={() => handleStart('extraction')}
                        delay={0.5}
                    />

                    {/* 7. Design Agent (New) */}
                    <FeatureCard 
                        title={t['wf.creative']}
                        desc="Generate high-end posters and banners from text prompts."
                        icon={Zap}
                        bgColor="bg-[#FDFFB6]"
                        shapeClass="w-36 h-28 bg-white rounded-[50px] skew-x-6"
                        onClick={() => handleStart('creative')}
                        delay={0.6}
                    />

                    {/* 8. One-Click Planting */}
                    <FeatureCard 
                        title={t['tool.planting.label']}
                        desc={t['tool.planting.desc']}
                        icon={Sparkles}
                        bgColor="bg-[#FFADAD]"
                        shapeClass="w-32 h-32 bg-white rounded-[2rem_0_2rem_0]"
                        onClick={() => handleStart('planting')}
                        delay={0.7}
                        tag="HOT"
                    />
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-studio-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center relative z-10">
                    <div>
                        <div className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight">2M+</div>
                        <div className="text-studio-400 text-sm font-medium uppercase tracking-wider">Images Generated</div>
                    </div>
                    <div>
                        <div className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight">500+</div>
                        <div className="text-studio-400 text-sm font-medium uppercase tracking-wider">Enterprise Brands</div>
                    </div>
                    <div>
                        <div className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight">10x</div>
                        <div className="text-studio-400 text-sm font-medium uppercase tracking-wider">Faster Workflow</div>
                    </div>
                    <div>
                        <div className="text-4xl lg:text-5xl font-bold mb-2 tracking-tight">4.9</div>
                        <div className="text-studio-400 text-sm font-medium uppercase tracking-wider">User Rating</div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white pt-20 pb-12 border-t border-studio-100">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 lg:col-span-2">
                         <Logo />
                         <p className="mt-6 text-studio-500 max-w-sm leading-relaxed text-sm">
                             {t['home.footer.desc']}
                         </p>
                    </div>
                    <div>
                        <h4 className="font-bold mb-6 text-studio-900">Product</h4>
                        <ul className="space-y-4 text-sm text-studio-500">
                            <li><button onClick={() => handleStart('agent_batch')} className="hover:text-studio-900 transition-colors">Design Agent</button></li>
                            <li><button onClick={() => handleStart('bg_swap')} className="hover:text-studio-900 transition-colors">Scene Swap</button></li>
                            <li><button onClick={() => handleStart('face_swap')} className="hover:text-studio-900 transition-colors">Virtual Model</button></li>
                            <li><button onClick={() => handleStart('fusion')} className="hover:text-studio-900 transition-colors">Mannequin Fusion</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-6 text-studio-900">Company</h4>
                        <ul className="space-y-4 text-sm text-studio-500">
                            <li><a href="#" className="hover:text-studio-900 transition-colors">About</a></li>
                            <li><a href="#" className="hover:text-studio-900 transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-studio-900 transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-studio-900 transition-colors">Contact</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-studio-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-studio-400">
                    <div>© 2024 LUMA AI Inc. All rights reserved.</div>
                    <div className="flex gap-6">
                        <span className="hover:text-studio-900 cursor-pointer">Terms</span>
                        <span className="hover:text-studio-900 cursor-pointer">Privacy</span>
                        <span className="hover:text-studio-900 cursor-pointer">Security</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
