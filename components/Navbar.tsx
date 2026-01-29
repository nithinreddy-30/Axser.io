
import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types.ts';

interface NavbarProps {
  onHomeClick: () => void;
  onScanClick: () => void;
  onWardrobeClick: () => void;
  onOutfitsClick: () => void;
  onStyleClick: () => void;
  onNotificationsClick: () => void;
  onSignInClick: () => void;
  onSignOutClick: () => void;
  onProfileClick: () => void;
  currentView: string;
  user: User | null;
  isAdmin?: boolean;
  notifications?: Notification[];
}

const Navbar: React.FC<NavbarProps> = ({ 
  onHomeClick, 
  onScanClick, 
  onWardrobeClick, 
  onStyleClick, 
  onNotificationsClick,
  onSignInClick,
  onSignOutClick,
  onProfileClick,
  currentView,
  user,
  isAdmin,
  notifications = []
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[90] bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between transition-all duration-300">
        {/* Logo Section */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onHomeClick}>
          <div className="w-9 h-9 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[15deg]">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_12px_rgba(123,44,191,0.6)]">
              <path d="M110 25C70 20 25 60 25 110C25 130 32 150 45 165" stroke="#7B2CBF" strokeWidth="18" strokeLinecap="round" />
              <path d="M90 175C130 180 175 140 175 90C175 70 168 50 155 35" stroke="#7B2CBF" strokeWidth="18" strokeLinecap="round" />
              <circle cx="100" cy="100" r="62" fill="#7B2CBF" />
              <g stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9">
                <path d="M85 85C80 90 80 110 85 115" /><path d="M78 78C70 85 70 115 78 122" /><path d="M71 71C60 80 60 120 71 129" /><path d="M64 64C50 75 50 125 64 136" />
                <path d="M115 85C120 90 120 110 115 115" /><path d="M122 78C130 85 130 115 122 122" /><path d="M129 71C140 80 140 120 129 129" /><path d="M136 64C150 75 150 125 136 136" />
              </g>
            </svg>
          </div>
          <span className="text-xl font-black uppercase tracking-tighter text-white">
            AXSER<span className="text-[#7B2CBF]">.IO</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center bg-[#111111]/50 border border-white/5 rounded-2xl p-1 shadow-2xl">
            <NavPillItem icon={<HomeIcon />} label="Home" active={currentView === 'home'} onClick={() => handleAction(onHomeClick)} />
            {!isAdmin && (
              <>
                <NavPillItem icon={<ScanIcon />} label="Scan" active={currentView === 'verify'} onClick={() => handleAction(onScanClick)} />
                <NavPillItem icon={<WardrobeIcon />} label="Wardrobe" active={currentView === 'wardrobe'} onClick={() => handleAction(onWardrobeClick)} />
                <NavPillItem icon={<StyleIcon />} label="AI Style" active={currentView === 'ai-style'} onClick={() => handleAction(onStyleClick)} />
                <div className="w-px h-6 bg-white/10 mx-2" />
                <NavPillItem 
                  icon={<BellIcon />} 
                  label="Activity" 
                  active={currentView === 'notifications'} 
                  onClick={() => handleAction(onNotificationsClick)} 
                  count={unreadCount > 0 ? unreadCount : undefined}
                />
              </>
            )}
            {isAdmin && <NavPillItem icon={<DashboardIcon />} label="Admin Panel" active={currentView === 'profile'} onClick={() => handleAction(onProfileClick)} />}
            <div className="w-px h-6 bg-white/10 mx-2" />
            {!isAdmin && <NavPillItem icon={<ProfileIcon />} label="Profile" active={currentView === 'profile'} onClick={() => handleAction(onProfileClick)} />}
            <NavPillItem icon={<SignOutIcon />} label={user ? "Exit" : "Login"} onClick={() => handleAction(user ? onSignOutClick : onSignInClick)} />
          </div>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsMenuOpen(true)} className="lg:hidden w-10 h-10 bg-[#111111] border border-white/5 rounded-xl flex items-center justify-center text-white active:scale-95 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeWidth={2} />
          </svg>
        </button>
      </nav>

      {/* Full Screen Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[16px] lg:hidden animate-in fade-in duration-300 flex flex-col">
          <div className="flex justify-end p-4 md:px-8 py-4">
             <button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 bg-[#111111] border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path d="M6 18L18 6M6 6l12 12" strokeWidth={2} />
               </svg>
             </button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-6 pb-20 no-scrollbar">
            <div className="w-full max-w-sm flex flex-col gap-3">
              <NavPillItem icon={<HomeIcon />} label="Home" active={currentView === 'home'} onClick={() => handleAction(onHomeClick)} mobile />
              {!isAdmin && (
                <>
                  <NavPillItem icon={<ScanIcon />} label="Scan Product" active={currentView === 'verify'} onClick={() => handleAction(onScanClick)} mobile />
                  <NavPillItem icon={<WardrobeIcon />} label="My Wardrobe" active={currentView === 'wardrobe'} onClick={() => handleAction(onWardrobeClick)} mobile />
                  <NavPillItem icon={<StyleIcon />} label="AI Stylist" active={currentView === 'ai-style'} onClick={() => handleAction(onStyleClick)} mobile />
                  <NavPillItem icon={<BellIcon />} label="Activity Log" active={currentView === 'notifications'} onClick={() => handleAction(onNotificationsClick)} count={unreadCount > 0 ? unreadCount : undefined} mobile />
                  <NavPillItem icon={<ProfileIcon />} label="My Profile" active={currentView === 'profile'} onClick={() => handleAction(onProfileClick)} mobile />
                </>
              )}
              {isAdmin && <NavPillItem icon={<DashboardIcon />} label="Admin Dashboard" active={currentView === 'profile'} onClick={() => handleAction(onProfileClick)} mobile />}
              <div className="h-4" />
              <NavPillItem icon={<SignOutIcon />} label={user ? "Sign Out" : "Sign In"} onClick={() => handleAction(user ? onSignOutClick : onSignInClick)} mobile />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const NavPillItem: React.FC<any> = ({ icon, label, active, onClick, mobile, count }) => {
  const base = "flex items-center transition-all whitespace-nowrap relative";
  const mobileClasses = mobile 
    ? "w-full justify-start text-xs gap-4 px-6 py-5 rounded-2xl border font-black uppercase tracking-widest" 
    : "gap-2 px-4 py-2 rounded-xl text-[11px] font-bold";
    
  const activeClasses = mobile
    ? (active ? "bg-[#7B2CBF] text-white border-[#7B2CBF] shadow-xl shadow-[#7B2CBF]/20" : "bg-[#111]/50 border-white/5 text-[#888] hover:text-white hover:bg-white/10 hover:border-white/20")
    : (active ? "bg-[#7B2CBF] text-white shadow-lg" : "text-[#888] hover:text-white hover:bg-white/5");

  return (
      <button onClick={onClick} className={`${base} ${mobileClasses} ${activeClasses}`}>
        <span className={`${active ? 'text-white' : 'text-[#888]'} w-5 h-5 flex items-center justify-center`}>{icon}</span>
        <span>{label}</span>
        {count !== undefined && (
          <span className={`flex items-center justify-center rounded-full font-black ${mobile ? 'bg-white text-[#7B2CBF] w-5 h-5 text-[9px] ml-auto' : 'bg-white text-[#7B2CBF] w-4 h-4 text-[8px] absolute -top-1 -right-1 shadow-lg'}`}>
            {count}
          </span>
        )}
      </button>
  );
};

const HomeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ScanIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3H5a2 2 0 00-2 2v2m14-4h2a2 2 0 012 2v2m-4 14h2a2 2 0 002-2v-2M3 17v2a2 2 0 002 2h2M9 12h6m-3-3v6" />
  </svg>
);
const WardrobeIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2M4 7h16M4 7v12a2 2 0 002 2h12a2 2 0 002-2V7M9 7v14M15 7v14" />
  </svg>
);
const StyleIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const BellIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const ProfileIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const SignOutIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1" />
  </svg>
);
const DashboardIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default Navbar;
