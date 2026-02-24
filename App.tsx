
import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { WritingSession, AppStatus } from './types';
import { getAiSuggestion, suggestTitle } from './services/geminiService';
import { 
  CloudRain, 
  Sparkles, 
  Download, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Info,
  Type as FontIcon
} from 'lucide-react';

/**
 * RainEffect: Renders a subtle CSS-based falling rain overlay.
 */
const RainEffect: React.FC = () => {
  const drops = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 1.0 + Math.random() * 2,
      delay: Math.random() * 5,
      opacity: 0.05 + Math.random() * 0.15
    }));
  }, []);

  return (
    <div className="rain-container">
      {drops.map(drop => (
        <div 
          key={drop.id}
          className="rain-drop"
          style={{
            left: `${drop.left}%`,
            animationDuration: `${drop.duration}s`,
            animationDelay: `${drop.delay}s`,
            opacity: drop.opacity
          }}
        />
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [content, setContent] = useState<string>(() => localStorage.getItem('zen-writer-content') || '');
  const [title, setTitle] = useState<string>(() => localStorage.getItem('zen-writer-title') || '雨夜随笔');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [showUI, setShowUI] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);

  // Sync to local storage and update statistics
  useEffect(() => {
    localStorage.setItem('zen-writer-content', content);
    localStorage.setItem('zen-writer-title', title);
    setWordCount(content.trim().length);
  }, [content, title]);

  /**
   * ADJUST HEIGHT: 
   * This is the critical fix for the scroll-jump bug.
   * Instead of collapsing height to 0px (which shrinks the document and resets scroll),
   * we use a wrapper to preserve the space during the measurement.
   */
  const adjustHeight = useCallback(() => {
    const editor = editorRef.current;
    const wrapper = wrapperRef.current;
    if (editor && wrapper) {
      // 1. Temporarily fix the wrapper height to current height to prevent page collapse
      wrapper.style.minHeight = `${editor.offsetHeight}px`;
      
      // 2. Adjust textarea height
      editor.style.height = 'auto'; 
      const newHeight = editor.scrollHeight;
      editor.style.height = `${newHeight}px`;
      
      // 3. Update wrapper to match new height
      wrapper.style.minHeight = `${newHeight}px`;
    }
  }, []);

  /**
   * CARET TRACKING:
   * Keeps the current line of text within the comfortable visual center of the screen.
   */
  const scrollCaretIntoView = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const { selectionEnd, value } = editor;
    const lines = value.substring(0, selectionEnd).split('\n');
    const lineCount = lines.length;
    const style = getComputedStyle(editor);
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
    
    const caretOffsetTop = lineCount * lineHeight;
    const editorRect = editor.getBoundingClientRect();
    const globalCaretY = editorRect.top + window.scrollY + caretOffsetTop;
    
    const viewportHeight = window.innerHeight;
    const lowerThreshold = window.scrollY + (viewportHeight * 0.75); // Don't let caret fall below 75%
    
    if (globalCaretY > lowerThreshold) {
      window.scrollTo({
        top: globalCaretY - (viewportHeight * 0.5), // Center it
        behavior: 'smooth'
      });
    }
  }, [fontSize]);

  // Adjust height before the browser paints to avoid flickering/jumping
  useLayoutEffect(() => {
    adjustHeight();
  }, [content, fontSize, adjustHeight]);

  // Handle UI visibility based on movement
  const handleMouseMove = useCallback(() => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current || content.length > 0) {
        setShowUI(false);
      }
    }, 4000);
  }, [content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isTypingRef.current = true;
    setContent(e.target.value);
    
    // Smoothly follow the cursor
    requestAnimationFrame(() => {
      scrollCaretIntoView();
    });

    // Auto-hide UI while actively writing
    if (showUI) {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 2000);
    }
  };

  const handleAiMuse = async () => {
    if (!content.trim()) return;
    setStatus(AppStatus.AI_THINKING);
    const suggestion = await getAiSuggestion(content);
    setContent(prev => prev + "\n\n" + suggestion);
    setStatus(AppStatus.IDLE);
    
    // Give the DOM a moment to update heights then scroll
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleSuggestTitle = async () => {
    if (!content.trim()) return;
    setStatus(AppStatus.AI_THINKING);
    const newTitle = await suggestTitle(content);
    setTitle(newTitle);
    setStatus(AppStatus.IDLE);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([`${title}\n\n${content}`], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title || 'ZenWriter'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleClear = () => {
    if (window.confirm("确定要清空当前所有内容吗？此操作不可撤销。")) {
      setContent('');
      setTitle('新篇章');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center selection:bg-white/30"
      onMouseMove={handleMouseMove}
      onClick={() => isTypingRef.current = false}
    >
      {/* Immersive Background Container */}
      <div className="fixed inset-0 z-0 bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-[25px] opacity-70 scale-110"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=2000')" }}
        />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover filter blur-[30px] saturate-[1.4] opacity-40 scale-105"
        >
          <source src="https://player.vimeo.com/external/391060699.hd.mp4?s=340f1a6f5e888636f36814b2d183863776d338e3&profile_id=175" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none z-10" />
      </div>

      <RainEffect />

      {/* Floating Header UI */}
      <header className={`fixed top-0 left-0 w-full p-8 z-50 flex justify-between items-center transition-all duration-1000 ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-4 text-white/80 group cursor-default">
          <div className="p-2.5 rounded-2xl glass-surface border-white/10 shadow-lg">
            <CloudRain className="w-5 h-5 text-blue-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-serif italic text-xl tracking-[0.25em] uppercase readable-shadow">Zen Mode</h1>
            <span className="text-[9px] tracking-[0.5em] text-white/20 font-light mt-0.5">PURITY OF THOUGHT</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center glass-surface rounded-full p-1 mr-2 bg-white/5 border-white/5">
            <button 
              onClick={() => setFontSize(Math.max(16, fontSize - 2))}
              className="px-3 py-1 text-white/40 hover:text-white transition-all"
            >－</button>
            <FontIcon className="w-3.5 h-3.5 text-white/20" />
            <button 
              onClick={() => setFontSize(Math.min(42, fontSize + 2))}
              className="px-3 py-1 text-white/40 hover:text-white transition-all"
            >＋</button>
          </div>

          <button 
            onClick={handleAiMuse}
            disabled={status === AppStatus.AI_THINKING}
            className="flex items-center gap-2.5 px-7 py-3 rounded-full glass-surface text-white/80 hover:text-white hover:scale-105 active:scale-95 transition-all text-sm group shadow-xl"
          >
            <Sparkles className={`w-4 h-4 ${status === AppStatus.AI_THINKING ? 'animate-spin text-blue-300' : 'group-hover:text-blue-300 transition-transform duration-700'}`} />
            {status === AppStatus.AI_THINKING ? '冥思中...' : '灵感缪斯'}
          </button>
          
          <button onClick={handleDownload} className="p-3.5 rounded-full glass-surface text-white/40 hover:text-white transition-all shadow-lg"><Download className="w-5 h-5" /></button>
          <button onClick={toggleFullscreen} className="p-3.5 rounded-full glass-surface text-white/40 hover:text-white transition-all shadow-lg">{isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
        </div>
      </header>

      {/* Main Sanctuary Editor */}
      <main className="relative z-20 w-full max-w-4xl px-4 mt-44 mb-[60vh] transition-all duration-1000">
        <div className={`w-full glass-surface rounded-[64px] p-12 md:p-24 min-h-[85vh] flex flex-col items-center transition-all duration-1000 border-white/5 ${content.length > 0 ? 'shadow-[0_40px_120px_rgba(0,0,0,0.6)]' : 'mt-16 opacity-90'}`}>
          
          {/* Header/Title Logic */}
          <div className="w-full mb-24 flex flex-col items-center group relative">
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => isTypingRef.current = false}
              placeholder="命名这瞬灵感..."
              className="bg-transparent text-center text-white/95 font-serif text-4xl md:text-7xl outline-none border-none placeholder:text-white/5 w-full focus:placeholder:opacity-0 transition-all readable-shadow py-2"
              style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 700 }}
            />
            <button 
                onClick={handleSuggestTitle}
                className="mt-8 opacity-0 group-hover:opacity-100 transition-all p-2 text-white/20 hover:text-white/60 flex items-center gap-3 text-xs tracking-[0.4em] uppercase"
            >
                <Sparkles className="w-3.5 h-3.5" />
                AI 赋予篇名
            </button>
            <div className="w-40 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-12" />
          </div>

          {/* Stable Editor Implementation */}
          <div ref={wrapperRef} className="w-full relative transition-all duration-300">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleContentChange}
              onFocus={() => isTypingRef.current = true}
              onBlur={() => {
                // Short delay to allow button clicks to process before UI hides
                setTimeout(() => { isTypingRef.current = false; }, 250);
              }}
              placeholder="心若止水，笔尖生花..."
              className="w-full bg-transparent text-white/90 font-serif leading-[2.4] outline-none border-none resize-none placeholder:text-white/10 no-scrollbar readable-shadow"
              style={{ 
                fontFamily: "'Noto Serif SC', serif",
                fontSize: `${fontSize}px`,
                letterSpacing: '0.04em',
                overflow: 'hidden', // Page handles scrolling
                display: 'block',
                width: '100%'
              }}
            />
            {!content && <span className="writing-cursor absolute top-0 left-0" />}
          </div>
        </div>
      </main>

      {/* Stats and Meta UI */}
      <footer className={`fixed bottom-0 left-0 w-full p-12 z-50 flex justify-between items-end transition-all duration-1000 pointer-events-none ${showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="flex flex-col gap-5 pointer-events-auto">
            <button 
                onClick={handleClear}
                className="p-4.5 rounded-full glass-surface text-white/10 hover:text-red-400/90 hover:bg-red-400/5 transition-all group border-white/5 shadow-2xl"
                title="舍弃当前内容"
            >
                <Trash2 className="w-5.5 h-5.5 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
            </button>
            <div className="px-6 py-3 rounded-full glass-surface text-[9px] tracking-[0.5em] text-white/20 font-light border-white/5 bg-black/20 shadow-xl">
                已加密保存 {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        </div>

        <div className="flex flex-col items-end gap-5 pointer-events-auto">
            <div className="flex items-center gap-10 glass-surface px-12 py-6 rounded-full text-white/40 text-xs tracking-[0.2em] font-light border-white/5 bg-white/2 shadow-2xl">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-white font-bold text-2xl tracking-normal">{wordCount}</span>
                    <span className="text-[9px] opacity-30 uppercase">累计字数</span>
                </div>
                <div className="w-px h-12 bg-white/5" />
                <div className="flex flex-col items-center gap-2">
                    <span className="text-white font-bold text-2xl tracking-normal">{Math.ceil(wordCount / 450) || 1}</span>
                    <span className="text-[9px] opacity-30 uppercase">建议读时</span>
                </div>
            </div>
            <div className="flex items-center gap-2.5 text-white/10 text-[9px] uppercase tracking-[0.4em] mr-8">
                <Info className="w-3 h-3" />
                本地沉浸式写作空间
            </div>
        </div>
      </footer>
      
      {/* Dynamic Glow Decorations */}
      <div className="fixed -top-1/4 -left-1/4 w-full h-full bg-blue-500/10 rounded-full filter blur-[250px] pointer-events-none mix-blend-screen animate-pulse opacity-20" />
      <div className="fixed -bottom-1/4 -right-1/4 w-full h-full bg-indigo-600/10 rounded-full filter blur-[250px] pointer-events-none mix-blend-screen animate-pulse opacity-20" style={{ animationDelay: '5s' }} />
    </div>
  );
};

export default App;
