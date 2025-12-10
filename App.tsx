
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { OperationPanel } from './components/OperationPanel';
import { CanvasArea } from './components/CanvasArea';
import { DesignAgent } from './components/DesignAgent';
import { HomePage } from './components/HomePage';
import { useAppStore } from './store';
import { KeyRound, ExternalLink, Loader2 } from 'lucide-react';

function App() {
  const { apiKeyMissing, setApiKeyMissing, activeWorkflow, theme } = useAppStore();
  const [hasCheckedKey, setHasCheckedKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // 检查是否有选中的 API Key
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const has = await aistudio.hasSelectedApiKey();
        if (!has) {
          setApiKeyMissing(true);
        }
      }
      setHasCheckedKey(true);
    };
    checkKey();
  }, [setApiKeyMissing]);

  // Sync theme with document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // 用户完成选择后，假定成功并重置状态
      setApiKeyMissing(false);
    }
  };

  // 初始化加载状态
  if (!hasCheckedKey) {
     return (
        <div className="h-screen w-screen flex items-center justify-center bg-white text-indigo-600 gap-2">
            <Loader2 className="animate-spin" /> 
            <span>Initializing Application...</span>
        </div>
     );
  }

  // API Key 缺失/权限不足时的全屏引导
  if (apiKeyMissing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 p-4 font-sans text-gray-900">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
             <KeyRound size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-3">连接 Google Cloud</h1>
          <p className="text-gray-600 mb-8 leading-relaxed text-sm">
            本应用使用 <strong>Gemini 3 Pro</strong> 和 <strong>Veo</strong> 等高级生成式 AI 模型。
            <br/><br/>
            请选择一个已关联 Billing (计费) 的 Google Cloud 项目 API Key 以继续使用。
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 mb-6"
          >
            选择或创建 API Key
          </button>
          
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              了解 Gemini API 计费说明
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- ROUTING LOGIC ---
  
  // If workflow is 'home', show the Landing Page
  if (activeWorkflow === 'home') {
    return <HomePage />;
  }

  // Otherwise, show the Editor Interface
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-studio-950 text-gray-900 dark:text-gray-100 font-sans relative transition-colors duration-300">
      {/* 区域一：侧边栏 */}
      <Sidebar />
      
      {/* 区域二：操作面板 */}
      <OperationPanel />
      
      {/* 区域三：智能画布 */}
      <CanvasArea />
      
      {/* 区域四：AI 设计助理 (悬浮) */}
      <DesignAgent />
    </div>
  );
}

export default App;