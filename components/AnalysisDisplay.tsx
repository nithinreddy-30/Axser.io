
import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisDisplayProps {
  result: AnalysisResult;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  return (
    <div className="w-full max-w-6xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Blueprint Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-purple-100 p-8 rounded-3xl relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-900/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
            <h2 className="text-4xl font-black mb-4 tracking-tight text-purple-900">{result.title}</h2>
            <p className="text-purple-400 text-lg leading-relaxed max-w-2xl font-medium">{result.description}</p>
            
            {result.searchReferences && result.searchReferences.length > 0 && (
              <div className="mt-6 pt-6 border-t border-purple-50 flex flex-wrap gap-4">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Sources:</span>
                {result.searchReferences.map((ref, i) => (
                  <a key={i} href={ref.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-900 hover:text-purple-600 flex items-center gap-1 transition-colors font-bold">
                    {ref.title}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Structure Card */}
            <div className="bg-white border border-purple-100 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-900" />
                Site Architecture
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 mb-2">Pages</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.siteStructure.pages.map((p, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-50 rounded text-xs text-purple-900 font-mono">/{p.toLowerCase().replace(/\s+/g, '-')}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 mb-2">Core Components</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {result.siteStructure.components.map((c, i) => (
                      <div key={i} className="text-xs text-purple-900 font-bold flex items-center gap-2">
                        <div className="w-1 h-1 bg-purple-200 rounded-full" />
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Stack Card */}
            <div className="bg-white border border-purple-100 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Recommended Stack
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {result.techStack.map((tech, i) => (
                  <div key={i} className="p-3 bg-purple-50 rounded-xl border border-purple-100 hover:border-purple-400/30 transition-colors">
                    <div className="text-xs font-bold text-purple-900">{tech}</div>
                    <div className="text-[10px] text-purple-300 mt-1 uppercase font-black">Infrastructure</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Features Detail */}
          <div className="bg-white border border-purple-100 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-black uppercase tracking-tight text-purple-900 mb-6">Functional Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.features.map((feature, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-purple-50/30 border border-purple-50 hover:bg-purple-50 transition-all">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-purple-900 flex items-center justify-center text-white font-mono text-sm shadow-lg shadow-purple-900/10">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-purple-900 font-bold leading-snug">{feature}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          {/* Visual Identity */}
          <div className="bg-white border border-purple-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-4">Visual Identity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-400 font-bold">Primary</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-purple-900 font-bold">{result.colorPalette.primary}</span>
                  <div className="w-4 h-4 rounded shadow-sm border border-purple-100" style={{ background: result.colorPalette.primary }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-400 font-bold">Accent</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-purple-900 font-bold">{result.colorPalette.accent}</span>
                  <div className="w-4 h-4 rounded shadow-sm border border-purple-100" style={{ background: result.colorPalette.accent }} />
                </div>
              </div>
              <p className="text-xs text-purple-400 mt-4 leading-relaxed border-t border-purple-50 pt-4 italic font-medium">
                "{result.uxPhilosophy}"
              </p>
            </div>
          </div>

          {/* User Profile */}
          <div className="bg-white border border-purple-100 p-6 rounded-2xl shadow-sm">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-3">Target Users</h3>
            <p className="text-sm text-purple-900 font-bold leading-relaxed">{result.targetAudience}</p>
          </div>

          <button className="w-full group bg-purple-900 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-purple-900/20 hover:bg-purple-950 transition-all flex items-center justify-center gap-2">
            Build Final Code
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          
          <div className="p-6 rounded-2xl border border-purple-100 bg-purple-50">
            <h4 className="text-xs font-black uppercase tracking-widest text-purple-900 mb-2">Pro Tip</h4>
            <p className="text-[11px] text-purple-400 font-bold">
              Combine this analysis with a headless CMS recommendation for maximum scalability during the build phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
