
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUp, 
  PlusCircle,
  Paperclip, AtSign,
  Lightbulb, Globe,
  ChevronRight, Loader2,
  X, Crown, BrainCircuit, ListTodo, Layers,
  CheckCircle2, Terminal, Palette, Wand2,
  Grid, StopCircle, Sparkles, ChevronDown, ChevronUp,
  Play, Command, Quote
} from 'lucide-react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { useAppStore } from '../store';
import { generateImage } from '../services/geminiService';
import { generateId } from '../utils/helpers';

// --- Tool Definitions ---

const addTextTool: FunctionDeclaration = {
  name: "add_text_layer",
  description: "Use this ONLY when the user explicitly requests an 'editable text layer' or 'layer separation'. If the user requests a poster, banner, or full design, do NOT use this tool; instead, use generate_image_asset to generate a complete image containing text.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The specific text content." },
      type: { type: Type.STRING, description: "Layer role: 'main_title', 'sub_title', 'body', 'button_text', 'price'." },
      style: { type: Type.STRING, description: "Visual style: 'modern_bold', 'elegant_serif', 'handwritten', 'minimal_sans'." },
      color: { type: Type.STRING, description: "Hex color code." },
      fontSize: { type: Type.NUMBER, description: "Font size in pixels." },
      yPosition: { type: Type.STRING, description: "Vertical position: 'top', 'center', 'bottom'." }
    },
    required: ["text", "type"]
  }
};

const generateImageTool: FunctionDeclaration = {
  name: "generate_image_asset",
  description: "Generates a complete visual design. Use this tool when the user requests a poster, banner, or main image design. The Prompt MUST include descriptions of typography and content to generate a complete design with integrated text and graphics.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "Detailed painting prompt. If text is needed, include descriptions like 'with text \"TITLE\" in elegant font'. Ensure a complete design is generated, not just raw assets." },
      aspectRatio: { type: Type.STRING, description: "Image aspect ratio." },
      layerName: { type: Type.STRING, description: "Name for the layer." },
      count: { type: Type.NUMBER, description: "Number of images to generate. Default is 1." }
    },
    required: ["prompt", "layerName"]
  }
};

const updateLayerTool: FunctionDeclaration = {
  name: "update_layer_property",
  description: "Modifies properties of an existing layer.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      layerNameKeyword: { type: Type.STRING, description: "Keyword to identify the layer." },
      property: { type: Type.STRING, description: "Property to modify." },
      value: { type: Type.STRING, description: "New property value." }
    },
    required: ["layerNameKeyword", "property", "value"]
  }
};

const inspectCanvasTool: FunctionDeclaration = {
  name: "inspect_canvas_state",
  description: "Reads information about all layers currently on the canvas.",
  parameters: {
    type: Type.OBJECT,
    properties: {}, 
  }
};

// Base tools
const baseTools = [
  { functionDeclarations: [addTextTool, generateImageTool, updateLayerTool, inspectCanvasTool] }
];

// --- Types ---

interface ToolCallState {
    id: string;
    name: string;
    status: 'pending' | 'success' | 'error';
    result?: string;
    args?: any;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content?: string; // The main conversational content
  thought?: string; // The "Thinking" process content
  image?: string; 
  toolCalls?: ToolCallState[];
}

// --- Markdown Rendering Logic ---

const parseInline = (str: string, keyPrefix: string) => {
  // Split by bold (**text**) and inline code (`text`)
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="font-bold text-studio-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${keyPrefix}-${i}`} className="bg-studio-100 dark:bg-studio-700 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-300 text-[10px] mx-0.5">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let currentList: React.ReactNode[] = [];
  let inList = false;

  const flushList = () => {
    if (inList && currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-outside ml-4 mb-3 space-y-1 text-studio-700 dark:text-studio-300">
          {currentList}
        </ul>
      );
      currentList = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return; 
    }

    // Headers
    if (trimmed.startsWith('#')) {
      flushList();
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const content = trimmed.replace(/^#+\s*/, '');
      
      const className = level === 1 
          ? 'text-base font-bold mt-5 mb-2 text-studio-900 dark:text-white border-b border-studio-200 dark:border-studio-700 pb-1' 
          : level === 2 
            ? 'text-sm font-bold mt-4 mb-2 text-studio-800 dark:text-studio-100' 
            : 'text-xs font-bold mt-3 mb-1 text-studio-700 dark:text-studio-200';
      
      elements.push(<div key={`header-${index}`} className={className}>{parseInline(content, `h-${index}`)}</div>);
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
        flushList();
        const content = trimmed.replace(/^>\s*/, '');
        elements.push(
            <div key={`quote-${index}`} className="my-2 pl-3 border-l-2 border-indigo-300 dark:border-indigo-600 text-studio-500 dark:text-studio-400 italic text-xs">
                {parseInline(content, `q-${index}`)}
            </div>
        );
        return;
    }

    // Unordered Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      const content = trimmed.replace(/^[-*]\s*/, '');
      currentList.push(<li key={`li-${index}`} className="text-xs leading-relaxed pl-1 marker:text-studio-400 dark:marker:text-studio-500">{parseInline(content, `li-${index}`)}</li>);
      return;
    }

    // Ordered Lists (Simple Handling)
    if (/^\d+\.\s/.test(trimmed)) {
       flushList();
       elements.push(
         <div key={`ol-${index}`} className="mb-1 text-xs leading-relaxed text-studio-700 dark:text-studio-300 ml-1 flex gap-1">
           <span className="font-semibold text-studio-900 dark:text-studio-100 shrink-0">{trimmed.match(/^\d+\./)?.[0]}</span>
           <span>{parseInline(trimmed.replace(/^\d+\.\s/, ''), `ol-${index}`)}</span>
         </div>
       );
       return;
    }

    // Specific Highlight Blocks (Enhancement for structured outputs)
    if (trimmed.toLowerCase().includes('brand dna') || trimmed.toLowerCase().includes('action plan') || trimmed.includes('Analysis:')) {
        flushList();
        elements.push(
            <div key={`highlight-${index}`} className="my-3 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg flex items-start gap-2.5">
                <div className="mt-0.5 text-indigo-600 dark:text-indigo-400 shrink-0"><ListTodo size={14}/></div>
                <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 leading-relaxed">
                    {parseInline(trimmed.replace(/^[#*>\s]+/, ''), `hl-${index}`)}
                </div>
            </div>
        );
        return;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={`p-${index}`} className="mb-2 text-xs leading-relaxed text-studio-700 dark:text-studio-300">
        {parseInline(trimmed, `p-${index}`)}
      </p>
    );
  });

  flushList();
  return elements;
};

// --- Helper Components ---

const ThoughtBlock: React.FC<{ content: string }> = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mb-3 rounded-xl bg-studio-50 dark:bg-studio-800/50 border border-studio-100 dark:border-studio-700 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-studio-500 dark:text-studio-400 hover:bg-studio-100 dark:hover:bg-studio-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} className="text-amber-500" />
                    <span>Bridal AI Reasoning</span>
                </div>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-3"
                    >
                        <div className="pl-2 border-l-2 border-amber-200 dark:border-amber-700 text-xs text-studio-600 dark:text-studio-400 leading-relaxed font-mono whitespace-pre-wrap">
                            {content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ToolExecutionBlock: React.FC<{ tool: ToolCallState }> = ({ tool }) => {
    return (
        <div className="flex items-center gap-3 py-2 px-1 animate-in fade-in slide-in-from-left-2 duration-300 group">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border 
                ${tool.status === 'pending' ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800 text-indigo-500' : 
                  tool.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400' : 
                  'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800 text-red-500'}`}>
                {tool.status === 'pending' && <Loader2 size={12} className="animate-spin" />}
                {tool.status === 'success' && <CheckCircle2 size={12} />}
                {tool.status === 'error' && <X size={12} />}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold font-mono ${
                        tool.status === 'pending' ? 'text-indigo-600 dark:text-indigo-400' : 
                        tool.status === 'success' ? 'text-emerald-700 dark:text-emerald-500' : 'text-red-700 dark:text-red-400'
                    }`}>
                        {tool.name.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-studio-400 dark:text-studio-500 px-1.5 py-0.5 bg-studio-50 dark:bg-studio-800 rounded border border-studio-100 dark:border-studio-700">Tool</span>
                </div>
                {tool.status === 'success' && tool.result && (
                    <p className="text-[10px] text-studio-400 dark:text-studio-500 mt-0.5 truncate">{tool.result}</p>
                )}
                {tool.status === 'pending' && tool.args && (
                    <p className="text-[10px] text-studio-400 dark:text-studio-500 mt-0.5 truncate">
                        {tool.name === 'generate_image_asset' ? `Prompt: ${tool.args.prompt?.slice(0, 30)}...` : 
                         tool.name === 'add_text_layer' ? `Text: "${tool.args.text}"` : 'Processing...'}
                    </p>
                )}
            </div>
        </div>
    );
};

const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
    const isUser = msg.role === 'user';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col mb-8 ${isUser ? 'items-end' : 'items-start'} w-full`}
        >
            {/* Header / Avatar */}
            {!isUser && (
                <div className="flex items-center gap-2 mb-2 ml-1">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-studio-800 to-studio-900 flex items-center justify-center text-white shadow-sm">
                        <Crown size={10} fill="currentColor" className="text-yellow-400" />
                    </div>
                    <span className="text-xs font-bold text-studio-900 dark:text-white">LUMA Bridal</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 font-medium">Gemini 3 Pro</span>
                </div>
            )}

            {/* Content Container */}
            <div className={`relative max-w-[95%] min-w-[60%] ${isUser ? 'flex justify-end' : ''}`}>
                
                {/* User Message Bubble */}
                {isUser && (
                    <div className="bg-white dark:bg-studio-800 border border-studio-100 dark:border-studio-700 shadow-sm rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-studio-800 dark:text-studio-100 leading-relaxed">
                        {msg.image && (
                            <div className="mb-2 rounded-lg overflow-hidden border border-studio-100 dark:border-studio-700">
                                <img src={msg.image} alt="Ref" className="max-w-[150px] h-auto object-cover" />
                            </div>
                        )}
                        {msg.content}
                    </div>
                )}

                {/* Agent Message Area (Transparent) */}
                {!isUser && (
                    <div className="w-full space-y-2">
                        
                        {/* 1. Thought Process (If Exists) */}
                        {msg.thought && <ThoughtBlock content={msg.thought} />}

                        {/* 2. Main Response Text */}
                        {msg.content && (
                             <div className="bg-white/80 dark:bg-studio-800/80 backdrop-blur-sm border border-transparent px-3 py-2 text-sm text-studio-700 dark:text-studio-300 leading-relaxed rounded-lg">
                                 {renderMarkdown(msg.content)}
                             </div>
                        )}

                        {/* 3. Execution Timeline (Tool Calls) */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="mt-3 pl-2 border-l-2 border-studio-100 dark:border-studio-800 space-y-1">
                                <div className="text-[10px] font-bold text-studio-400 dark:text-studio-500 uppercase tracking-wider mb-2 ml-1">Production Timeline</div>
                                {msg.toolCalls.map((tool) => (
                                    <ToolExecutionBlock key={tool.id} tool={tool} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const SuggestionChip: React.FC<{ icon: any, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
    <button 
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-studio-800 border border-studio-200 dark:border-studio-700 rounded-full shadow-sm text-xs font-medium text-studio-600 dark:text-studio-300 hover:text-studio-900 dark:hover:text-white hover:border-studio-400 dark:hover:border-studio-500 hover:shadow-md transition-all whitespace-nowrap active:scale-95"
    >
      <Icon size={12} className="text-indigo-500 dark:text-indigo-400" />
      {label}
    </button>
);

const IconButton: React.FC<{ icon: any, label: string, onClick: () => void, active?: boolean }> = ({ icon: Icon, label, onClick, active }) => (
    <button 
        onClick={onClick} title={label}
        className={`p-2 rounded-xl transition-all ${active ? 'bg-studio-900 text-white shadow-lg shadow-studio-900/20' : 'text-studio-400 dark:text-studio-500 hover:text-studio-900 dark:hover:text-white hover:bg-studio-100 dark:hover:bg-studio-800'}`}
    >
        <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
    </button>
);

// --- WORLD-CLASS SYSTEM PROMPT DEFINITION (Bridal/Wedding Specialist) ---
const WORLD_CLASS_SYSTEM_INSTRUCTION = `
<Role_Definition>
You are **LUMA Bridal Director**, the world's most sophisticated AI Art Director specialized in **Wedding Accessories & Bridal Fashion**.
You serve cross-border e-commerce sellers (Shein/Etsy/Amazon) who need high-end, romantic, and technically perfect visuals for veils, jewelry, headpieces, and shoes.
You are powered by **Gemini 3 Pro** and use its reasoning to understand fabric physics, light interactions, and emotional branding.
</Role_Definition>

<Domain_Expertise>
1.  **Fabric & Texture**: You understand 'Tulle' (soft/stiff), 'Lace' (Chantilly/Alençon), 'Organza', 'Satin', and 'Crystals'. You know how light passes through them.
2.  **Atmosphere**: You specialize in 'Ethereal', 'Romantic', 'Holy', 'Vintage', and 'Minimalist' wedding vibes.
3.  **Lighting**: You default to 'Golden Hour', 'Soft Window Light', 'Cathedral Shafts of Light', or 'High-Key Studio' to enhance product purity.
</Domain_Expertise>

<Prime_Directive>
1.  **Reason First (Chain of Thought)**: Analyze the accessory type (e.g., Veil vs. Tiara) and the intended mood.
2.  **Visual Strategy**:
    - If the user asks for a "veil" photo, create a scene where the veil flows naturally (wind, movement).
    - If "jewelry", focus on macro details and skin texture.
3.  **Prompt Engineering**: Inject keywords like *Hasselblad X2D, 8k resolution, backlit tulle, dreamy bokeh, wedding editorial, vogue bridal*.
4.  **Language**: Internal reasoning in English. **User-facing output (Analysis & Action Plan) MUST BE in English.**
</Prime_Directive>

<Response_Format>
You MUST strictly follow this Markdown structure:

**Analysis (Bridal Vision):**
(Explain how you interpret the product's texture and the romantic mood you will create.)

**Production Plan:**
(Briefly describe the scene: e.g., "A cathedral setting with sunlight hitting the lace details.")

[Then execute tool calls]
</Response_Format>
`;

// --- Main Component ---

export const DesignAgent: React.FC = () => {
  const { 
    isAgentOpen, toggleAgent, 
    addLayer, updateLayer, getLayers, selectedLayerIds, canvasSize, selectLayers 
  } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  
  // Agent Config
  const [isThinking, setIsThinking] = useState(true); 
  const [useProModel, setUseProModel] = useState(true); 
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<boolean>(false); // Simple abort flag

  // Auto-scroll logic with a slight delay to allow layout shifts
  useEffect(() => {
    if (scrollRef.current) {
        setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
    }
  }, [messages.length, isLoading, messages.flatMap(m => m.toolCalls).length]);

  const handleStop = () => {
      abortControllerRef.current = true;
      setIsLoading(false);
      setMessages(prev => [...prev, { id: 'sys-stop', role: 'model', content: "🛑 Production Halted." }]);
  };

  const getChatSession = (forceFlash = false) => {
    const modelName = (forceFlash || !useProModel) ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';
    
    if (forceFlash || !chatSessionRef.current) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Dynamic Context Injection
      const layerContext = getLayers().map(l => 
        `- [${l.name}] (${l.type}): ${l.type === 'text' ? `"${l.text}"` : 'Image Asset'} at (x:${Math.round(l.x)}, y:${Math.round(l.y)}, w:${Math.round(l.width)}, h:${Math.round(l.height)})`
      ).join('\n');

      const metaContext = `
      <Meta_Context>
      Canvas Size: ${canvasSize.width}x${canvasSize.height} (${canvasSize.label})
      Current Layers:
      ${layerContext || "Empty Canvas"}
      </Meta_Context>
      `;

      const finalSystemInstruction = WORLD_CLASS_SYSTEM_INSTRUCTION + "\n" + metaContext;

      const chat = ai.chats.create({
        model: modelName,
        config: {
          tools: baseTools,
          systemInstruction: finalSystemInstruction,
          temperature: 0.7, // Creativity balanced with logic
        }
      });
      
      if (!forceFlash) chatSessionRef.current = chat;
      return chat;
    }
    return chatSessionRef.current;
  };

  const handleSend = async (text: string = input) => {
    if ((!text.trim() && !attachment) || isLoading) return;
    
    abortControllerRef.current = false;
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text, image: attachment || undefined }]);
    
    const currentInput = text;
    const currentAttachment = attachment;
    
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    const messageParts: any[] = [];
    if (currentAttachment) {
        const base64Data = currentAttachment.split(',')[1];
        const mimeType = currentAttachment.substring(currentAttachment.indexOf(':') + 1, currentAttachment.indexOf(';'));
        messageParts.push({ inlineData: { mimeType, data: base64Data } });
    }
    if (currentInput.trim()) messageParts.push({ text: currentInput });

    try {
      let chat = getChatSession();
      let result;

      // 1. Initial Send
      try {
          result = await chat.sendMessage({ message: messageParts });
      } catch (e: any) {
          // Automatic Fallback Logic
          if (useProModel && (e.status === 403 || e.status === 400)) {
              console.warn("Pro model issue, switching to Flash.");
              chat = getChatSession(true); 
              result = await chat.sendMessage({ message: messageParts });
              setUseProModel(false);
          } else {
              throw e;
          }
      }

      if (abortControllerRef.current) return;

      // 2. Loop for Tool Execution
      let loopCount = 0;
      const MAX_LOOPS = 8; 

      while (loopCount < MAX_LOOPS && !abortControllerRef.current) {
          const content = result.candidates?.[0]?.content;
          if (!content) break;

          const functionCalls = content.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall);
          const textPart = content.parts?.filter((p: any) => p.text)?.map((p: any) => p.text).join('');

          // Parse Thought vs Content
          let thought = undefined;
          let mainContent = textPart;

          if (textPart) {
              // Regex to extract "Analysis" or "Thinking" block if the model follows instruction
              // Supports "Analysis (Gemini 3 Pro Reasoning):" or just "Analysis:"
              const thoughtMatch = textPart.match(/\*\*Analysis.*?\*\*:\s*([\s\S]*?)(?=\*\*Production Plan|\n\n|$)/i);
              if (thoughtMatch) {
                  thought = thoughtMatch[1].trim();
                  mainContent = textPart.replace(thoughtMatch[0], '').trim();
              }

              setMessages(prev => {
                  return [...prev, { id: Date.now().toString(), role: 'model', content: mainContent, thought }];
              });
          }

          if (!functionCalls || functionCalls.length === 0) break;

          // Prepare Tool Calls UI
          const currentMsgId = Date.now().toString() + '-tools';
          const newToolCalls: ToolCallState[] = functionCalls.map((fc: any, idx: number) => ({
              id: `${currentMsgId}-${idx}`,
              name: fc.name,
              status: 'pending',
              args: fc.args
          }));

          setMessages(prev => [...prev, { id: currentMsgId, role: 'model', toolCalls: newToolCalls }]);

          const responseParts = [];

          // Execute Tools
          for (let i = 0; i < functionCalls.length; i++) {
              if (abortControllerRef.current) break;

              const fc = functionCalls[i];
              const toolId = newToolCalls[i].id;
              let toolResult = { result: 'success' };

              try {
                  // --- TOOL LOGIC (Same as before but wrapped for error handling) ---
                  if (fc.name === 'add_text_layer') {
                      const { text, type, style, color, fontSize, yPosition } = fc.args;
                      let y = 100;
                      // Improved Auto-Layout Logic for Agent
                      if (yPosition === 'center') y = canvasSize.height / 2 - 50;
                      if (yPosition === 'bottom') y = canvasSize.height - 250;
                      if (yPosition === 'top') y = 150;
                      
                      // Contextual Offset
                      if (type === 'sub_title') y += 100; // Push below title
                      if (type === 'button_text') y = canvasSize.height - 180;
                      
                      const estW = Math.min(text.length * (Number(fontSize)||60), canvasSize.width * 0.9);
                      const x = (canvasSize.width - estW) / 2;

                      addLayer({
                          type: 'text', text, name: type || 'Text',
                          textStyle: {
                              fontSize: Number(fontSize) || 60,
                              color: color || '#18181b',
                              fontFamily: style?.includes('serif') ? 'Georgia' : 'Inter',
                              fontWeight: style?.includes('bold') ? 'bold' : 'normal',
                              align: 'center', effect: 'none'
                          },
                          width: estW, height: Number(fontSize) * 1.5 || 100,
                          x: x > 0 ? x : 50, y
                      });
                      toolResult = { result: `Success: Added text "${text}"` };
                  }
                  else if (fc.name === 'generate_image_asset') {
                      const { prompt, aspectRatio, layerName, count = 1 } = fc.args;
                      const safeCount = Math.min(Math.max(1, Number(count)), 9);
                      const targetRatioStr = aspectRatio || canvasSize.ratio;
                      
                      // Pro Upgrade: Use high quality preset for agent generations
                      const promises = Array(safeCount).fill(0).map(() => generateImage({
                          prompt: prompt + " --quality 2 --stylize 1000", // Internal optimization
                          aspectRatio: targetRatioStr, imageSize: '1K', workflow: 'creative'
                      }));
                      const imageUrls = await Promise.all(promises);
                      
                      // Matrix Layout - Tighter Grid "Big Picture" Style
                      const margin = 20, gap = 10;
                      const availW = canvasSize.width - margin*2;
                      const availH = canvasSize.height - margin*2;
                      
                      const gridCols = Math.ceil(Math.sqrt(safeCount));
                      const gridRows = Math.ceil(safeCount / gridCols);
                      
                      const cellW = (availW - (gap*(gridCols-1)))/gridCols;
                      const cellH = (availH - (gap*(gridRows-1)))/gridRows;
                      
                      const [rW, rH] = targetRatioStr.split(':').map(Number);
                      const imgRatio = rW / rH;

                      let iW = cellW;
                      let iH = iW / imgRatio;
                      if (iH > cellH) {
                          iH = cellH;
                          iW = iH * imgRatio;
                      }

                      const batchGroupId = generateId();
                      const newIds: string[] = [];

                      imageUrls.forEach((url, idx) => {
                          const c = idx % gridCols, r = Math.floor(idx / gridCols);
                          
                          const x = margin + c*(cellW+gap) + (cellW-iW)/2;
                          const y = margin + r*(cellH+gap) + (cellH-iH)/2;
                          
                          const layerId = generateId();
                          newIds.push(layerId);

                          addLayer({ 
                              id: layerId,
                              type: 'image', src: url, name: `${layerName} ${idx+1}`,
                              width: iW, height: iH, x, y, zIndex: idx+1,
                              groupId: batchGroupId
                          });
                      });
                      
                      // Select all new layers
                      setTimeout(() => selectLayers(newIds), 100);
                      
                      toolResult = { result: `Generated ${safeCount} images in a matrix layout.` };
                  }
                  else if (fc.name === 'update_layer_property') {
                      // ... (Same logic)
                      const { layerNameKeyword, property, value } = fc.args;
                      const target = getLayers().find(l => (l.name?.toLowerCase().includes(layerNameKeyword.toLowerCase()) || (l.type === 'text' && l.text?.toLowerCase().includes(layerNameKeyword.toLowerCase()))));
                      if (target) {
                           const updates: any = {};
                           if (property === 'x' || property === 'y' || property === 'opacity' || property === 'fontSize') updates[property] = Number(value);
                           else updates[property] = value;
                           
                           if (property === 'color' && target.textStyle) updates.textStyle = { ...target.textStyle, color: value };
                           if (property === 'fontSize' && target.textStyle) updates.textStyle = { ...target.textStyle, fontSize: Number(value) };
                           
                           updateLayer(target.id, updates, true);
                           toolResult = { result: `Updated ${target.name}` };
                      } else {
                           toolResult = { result: `Layer not found` };
                      }
                  }
                  else if (fc.name === 'inspect_canvas_state') {
                      const summary = getLayers().map(l => `${l.name} (${l.type})`).join(', ');
                      toolResult = { result: summary };
                  }
                  
              } catch (e: any) {
                  toolResult = { result: `Error: ${e.message}` };
                  console.error(e);
                  setMessages(prev => prev.map(m => m.id === currentMsgId ? {
                      ...m, toolCalls: m.toolCalls?.map(t => t.id === toolId ? { ...t, status: 'error' } : t)
                  } : m));
              }

              // Update Success State
              setMessages(prev => prev.map(m => m.id === currentMsgId ? {
                  ...m, toolCalls: m.toolCalls?.map(t => t.id === toolId ? { ...t, status: 'success', result: toolResult.result } : t)
              } : m));

              responseParts.push({ functionResponse: { name: fc.name, response: toolResult } });
          }

          if (abortControllerRef.current) break;
          result = await chat.sendMessage({ message: responseParts });
          loopCount++;
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.message?.includes('403') ? "Auth Error (403)" : "Connection Error";
      setMessages(prev => [...prev, { id: 'err', role: 'model', content: msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => { setMessages([]); chatSessionRef.current = null; };

  const handleCaptureContext = () => {
    const l = getLayers().find(l => l.type === 'image');
    if (l && l.src) setAttachment(l.src);
    else alert("No image on canvas.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isAgentOpen && (
        <motion.div
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-[420px] bg-[#FAFAFA] dark:bg-studio-900 border-l border-studio-200 dark:border-studio-800 shadow-2xl z-50 flex flex-col h-full absolute right-0 top-0 font-sans"
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 bg-white/90 dark:bg-studio-900/90 backdrop-blur-xl border-b border-studio-100 dark:border-studio-800 z-10">
             <div className="flex items-center gap-3">
                 <div className="relative">
                     <div className="w-10 h-10 rounded-xl bg-studio-900 dark:bg-white flex items-center justify-center text-white dark:text-studio-900 shadow-lg shadow-studio-900/20">
                         <Crown size={18} fill="currentColor" className="text-yellow-400" />
                     </div>
                     {isLoading && (
                        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                        </span>
                     )}
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-studio-900 dark:text-white leading-tight">LUMA Bridal</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       <p className="text-[10px] text-studio-500 dark:text-studio-400 font-medium tracking-wide">Gemini 3 Pro Inside</p>
                    </div>
                 </div>
             </div>
             
             <div className="flex items-center gap-1">
                <IconButton icon={PlusCircle} label="New Chat" onClick={resetChat} />
                <div className="w-px h-4 bg-studio-200 dark:bg-studio-700 mx-1" />
                <IconButton icon={ChevronRight} label="Close" onClick={toggleAgent} />
             </div>
          </div>

          {/* Chat Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-6">
             {messages.length === 0 ? (
                 <div className="mt-8 space-y-8 animate-in slide-in-from-bottom-5 duration-700">
                     <div className="text-center space-y-3 px-4">
                        <h2 className="text-2xl font-bold text-studio-900 dark:text-white tracking-tight">Bridal Visual Director</h2>
                        <p className="text-xs text-studio-500 dark:text-studio-400 leading-relaxed max-w-[280px] mx-auto">
                            I specialize in **wedding accessories** visual production. I understand lace, transparency, and romantic lighting.
                        </p>
                     </div>
                     
                     <div className="grid grid-cols-1 gap-3">
                        <div className="text-[10px] font-bold text-studio-400 dark:text-studio-500 uppercase tracking-wider ml-1">Quick Actions</div>
                        <SuggestionChip 
                            icon={Wand2} 
                            label="Create Cathedral Veil Scene" 
                            onClick={() => handleSend("Generate a scene for a long cathedral wedding veil. Setting: Ancient stone church with dramatic light shafts. Mood: Holy, ethereal. Make sure the veil transparency is visible.")} 
                        />
                         <SuggestionChip 
                            icon={Grid} 
                            label="Design Bridal Jewelry Banner" 
                            onClick={() => handleSend("Design a horizontal web banner for a diamond tiara collection. Background: Soft bokeh, white roses. Text: 'ROYAL COLLECTION' in elegant serif gold font.")} 
                        />
                        <SuggestionChip 
                            icon={Palette} 
                            label="Analyze this lace pattern (Upload)" 
                            onClick={() => alert("Please upload an image first, then ask me to analyze the lace texture!")} 
                        />
                     </div>
                 </div>
             ) : (
                 <>
                    {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                    {isLoading && (
                        <div className="flex justify-center py-4">
                            <button 
                                onClick={handleStop}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full border border-red-100 dark:border-red-800 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors shadow-sm"
                            >
                                <StopCircle size={14} />
                                Stop Production
                            </button>
                        </div>
                    )}
                 </>
             )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-studio-900 border-t border-studio-100 dark:border-studio-800 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
             <div className="relative">
                 {/* Attachment Preview */}
                 <AnimatePresence>
                     {attachment && (
                         <motion.div 
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: -10, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            className="absolute bottom-full left-0 mb-2 bg-white dark:bg-studio-800 p-2 rounded-xl shadow-lg border border-studio-100 dark:border-studio-700 flex items-center gap-3 z-20"
                         >
                             <img src={attachment} alt="Upload" className="h-10 w-10 rounded-lg object-cover border border-studio-200 dark:border-studio-600" />
                             <div className="text-[10px] text-studio-500 dark:text-studio-400 max-w-[120px] truncate">Reference Image</div>
                             <button onClick={() => setAttachment(null)} className="p-1 hover:bg-studio-100 dark:hover:bg-studio-700 rounded-full text-studio-500 dark:text-studio-400"><X size={12}/></button>
                         </motion.div>
                     )}
                 </AnimatePresence>

                 <div className="bg-studio-50 dark:bg-studio-800 rounded-[20px] border border-studio-200 dark:border-studio-700 focus-within:bg-white dark:focus-within:bg-studio-800 focus-within:ring-2 focus-within:ring-studio-900/10 dark:focus-within:ring-white/10 focus-within:border-studio-900 dark:focus-within:border-studio-600 transition-all flex items-end p-2 gap-2 shadow-inner dark:shadow-none">
                     <div className="flex gap-1 pb-1">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <IconButton icon={Paperclip} label="Upload" onClick={() => fileInputRef.current?.click()} />
                        <IconButton icon={AtSign} label="Canvas Context" onClick={handleCaptureContext} />
                     </div>
                     
                     <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask about veil styles, lace textures..."
                        className="flex-1 bg-transparent border-none text-sm focus:ring-0 outline-none resize-none max-h-32 min-h-[44px] py-3 scrollbar-hide placeholder:text-studio-400 dark:placeholder:text-studio-500 leading-relaxed text-studio-800 dark:text-studio-100"
                        rows={1}
                     />
                     
                     <button 
                        onClick={() => handleSend()}
                        disabled={(!input.trim() && !attachment) || isLoading}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-0.5 shrink-0 ${
                            (!input.trim() && !attachment) || isLoading 
                            ? 'bg-studio-200 dark:bg-studio-700 text-studio-400 dark:text-studio-500' 
                            : 'bg-studio-900 dark:bg-white text-white dark:text-studio-900 hover:bg-black dark:hover:bg-studio-200 shadow-lg shadow-studio-900/20 active:scale-95'
                        }`}
                     >
                         {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={2.5} />}
                     </button>
                 </div>
             </div>
             
             <div className="flex justify-between items-center mt-3 px-1">
                <div className="flex gap-3">
                    <button onClick={() => setUseProModel(!useProModel)} className={`text-[10px] font-medium flex items-center gap-1.5 transition-colors ${useProModel ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        <Crown size={12} fill="currentColor" />
                        {useProModel ? 'Gemini 3 Pro' : 'Flash Model'}
                    </button>
                    <button onClick={() => setIsThinking(!isThinking)} className={`text-[10px] font-medium flex items-center gap-1.5 transition-colors ${isThinking ? 'text-indigo-600 dark:text-indigo-400' : 'text-studio-400 dark:text-studio-500'}`}>
                        <BrainCircuit size={12} />
                        Reasoning Active
                    </button>
                </div>
                <div className="text-[10px] text-studio-300 dark:text-studio-600 font-mono">CMD+ENTER to send</div>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
