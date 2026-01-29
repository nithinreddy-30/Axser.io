
import React, { useState } from 'react';

interface PromptBoxProps {
  onAnalyze: (prompt: string) => void;
  isLoading: boolean;
}

const PromptBox: React.FC<PromptBoxProps> = ({ onAnalyze, isLoading }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onAnalyze(value.trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 relative">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-900 to-purple-400 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
        <div className="relative bg-white border border-purple-100 rounded-2xl p-2 flex flex-col md:flex-row items-stretch gap-2 shadow-xl shadow-purple-900/5">
          <div className="flex-1 flex items-center px-4">
            <svg className="w-5 h-5 text-purple-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Describe your styling vision or event..."
              className="w-full bg-transparent border-none focus:ring-0 text-lg px-4 py-4 placeholder-purple-200 text-purple-900 font-bold outline-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="bg-purple-900 text-white disabled:bg-purple-50 disabled:text-purple-200 px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 hover:bg-purple-950 shadow-lg shadow-purple-900/20 active:scale-95"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Analyzing
              </>
            ) : (
              "Generate Look"
            )}
          </button>
        </div>
      </form>
      
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-4 flex flex-col items-center gap-2 animate-pulse">
          <div className="text-[10px] text-purple-900 font-black tracking-widest uppercase">Initializing Neural Reconstruction</div>
          <div className="w-48 h-1 bg-purple-50 rounded-full overflow-hidden">
            <div className="h-full bg-purple-900 animate-loading-bar" />
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        {['Streetwear Night', 'Corporate Fusion', 'High-Fashion Gala', 'Minimalist Tech'].map((tag) => (
          <button
            key={tag}
            onClick={() => !isLoading && setValue(tag)}
            className="px-6 py-2 rounded-full bg-purple-50 border border-purple-100 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-purple-900 hover:border-purple-900/30 transition-all shadow-sm"
          >
            {tag}
          </button>
        ))}
      </div>
      
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s infinite linear;
          width: 50%;
        }
      `}</style>
    </div>
  );
};

export default PromptBox;
