
import React from 'react';
import { Notification } from '../types.ts';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll?: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ 
  notifications, 
  onMarkRead,
  onClearAll
}) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in slide-in-up w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
            Activity <span className="text-[#7B2CBF]">LOG</span>
          </h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Security alerts & access permissions</p>
        </div>
        {notifications.length > 0 && onClearAll && (
          <button 
            onClick={onClearAll}
            className="text-[10px] font-black uppercase tracking-widest text-[#444] hover:text-white transition-colors"
          >
            Clear Archive
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4 bg-[#111111] border border-white/5 border-dashed rounded-[48px]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-[#333]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-[#333333] font-black uppercase tracking-[0.6em] text-xs">No Recent Activity</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => !n.isRead && onMarkRead(n.id)}
              className={`group relative bg-[#111111] border p-8 rounded-[32px] transition-all cursor-pointer ${!n.isRead ? 'border-[#7B2CBF]/30 bg-[#7B2CBF]/5' : 'border-white/5 hover:border-white/10'}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black uppercase text-[#7B2CBF] tracking-widest">
                      {n.type.replace('_', ' ')}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[#333]" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-[#7B2CBF] transition-colors">
                    {n.title}
                  </h3>
                  <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-2xl">
                    {n.message}
                  </p>
                </div>
                
                {!n.isRead && (
                  <div className="shrink-0 flex items-center justify-end">
                    <div className="w-2 h-2 bg-[#7B2CBF] rounded-full shadow-[0_0_12px_rgba(123,44,191,0.8)]" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsView;
