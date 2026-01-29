
import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar.tsx';
import AuthModal from './components/AuthModal.tsx';
import ProfileView from './components/ProfileView.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import NotificationsView from './components/NotificationsView.tsx';
import { geminiService } from './services/geminiService.ts';
import { dbService } from './services/dbService.ts';
import { Garment, StylingSuggestion, VerificationResult, User, Notification } from './types.ts';

type View = 'home' | 'wardrobe' | 'outfits' | 'ai-style' | 'profile' | 'notifications';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [wardrobe, setWardrobe] = useState<Garment[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRequestSentModal, setShowRequestSentModal] = useState(false);
  
  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [productCode, setProductCode] = useState('');
  const [pendingGarment, setPendingGarment] = useState<Garment | null>(null);
  const [viewingGarment, setViewingGarment] = useState<Garment | null>(null);

  const [savedOutfits, setSavedOutfits] = useState<StylingSuggestion[]>([]);
  const [isStyling, setIsStyling] = useState(false);
  const [occasionPrompt, setOccasionPrompt] = useState('');
  const [styleAdvice, setStyleAdvice] = useState<StylingSuggestion | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  
  // Manual Form States
  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scroll Lock Helper
  useEffect(() => {
    const isOverlayOpen = showAuthModal || showLogoutConfirm || showSuccessModal || showRequestSentModal || showScanOverlay || showManualModal || viewingGarment;
    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showAuthModal, showLogoutConfirm, showSuccessModal, showRequestSentModal, showScanOverlay, showManualModal, viewingGarment]);

  const ScanIcon = () => (
    <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 3H5a2 2 0 00-2 2v2m14-4h2a2 2 0 012 2v2m-4 14h2a2 2 0 002-2v-2M3 17v2a2 2 0 002 2h2M9 12h6m-3-3v6" />
    </svg>
  );

  const StyleIcon = () => (
    <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );

  useEffect(() => {
    const { data: { subscription } } = dbService.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const adminEmail = 'pnradm9@gmail.com';
        const isUserAdmin = session.user.email === adminEmail;
        const profile = await dbService.getProfile(session.user.id);

        setUser({
          name: profile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Member',
          email: session.user.email!,
          memberSince: profile?.member_since || '2024',
          bio: profile?.bio || '',
          avatar: profile?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
          role: isUserAdmin ? 'admin' : 'user'
        });
        setIsAdmin(isUserAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
        setWardrobe([]);
        setSavedOutfits([]);
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await dbService.supabase
        .from('notifications')
        .select('*')
        .eq('userId', user.email)
        .order('timestamp', { ascending: false });
      setNotifications(data as Notification[] || []);
    };

    fetchNotifications();

    const notifSub = dbService.supabase
      .channel('notifs-channel-app-main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${user.email}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      dbService.supabase.removeChannel(notifSub);
    };
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const needsWardrobe = currentView === 'wardrobe' || currentView === 'ai-style' || wardrobe.length === 0;
      
      if (needsWardrobe) {
        setIsLoadingWardrobe(true);
        try {
          const allWardrobe = await dbService.getAllItems<any>('wardrobe');
          const allOutfits = await dbService.getAllItems<any>('outfits');
          
          const userEmail = user.email.toLowerCase();
          
          const filteredWardrobe = allWardrobe.filter(item => item.userId?.toLowerCase() === userEmail).map(item => ({
            id: item.id,
            name: item.name,
            type: item.type || 'Digital Twin',
            imageUrl: item.imageUrl,
            timestamp: item.timestamp,
            gender: item.gender || 'Unisex',
            brand: item.brand,
            accessCode: item.accessCode,
            userId: item.userId,
            isManual: item.isManual
          }));

          const filteredOutfits = allOutfits.filter(item => item.userId?.toLowerCase() === userEmail);
          
          setWardrobe(filteredWardrobe as Garment[]);
          setSavedOutfits(filteredOutfits as StylingSuggestion[]);
        } catch (err) {
          console.error("Data Fetch Error", err);
        } finally {
          setIsLoadingWardrobe(false);
        }
      }
    };

    fetchData();
  }, [user, currentView]);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`pending_scan_${user.email.toLowerCase()}`);
      if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setPendingGarment(parsed.garment);
            setRequestSent(parsed.requestSent || false);
            setShowCodeInput(parsed.showCodeInput || false);
        } catch(e) { localStorage.removeItem(`pending_scan_${user.email.toLowerCase()}`); }
      }
    }
  }, [user]);

  useEffect(() => {
    if (countdown > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    } else if (countdown === 0 && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const handleStartScan = async () => {
    setShowScanOverlay(true);
    
    if (user) {
        const savedKey = `pending_scan_${user.email.toLowerCase()}`;
        const saved = localStorage.getItem(savedKey);
        if (saved) {
            const parsed = JSON.parse(saved);
            setPendingGarment(parsed.garment);
            setRequestSent(parsed.requestSent || false);
            setShowCodeInput(parsed.showCodeInput || parsed.requestSent || false);
            return;
        }

        setIsVerifying(true);
        try {
            const { data: activeRequests } = await dbService.supabase
                .from('requests')
                .select('*')
                .eq('userId', user.email)
                .in('status', ['pending', 'resolved'])
                .order('timestamp', { ascending: false })
                .limit(1);

            if (activeRequests && activeRequests.length > 0) {
                const req = activeRequests[0];
                const { data: items } = await dbService.supabase
                    .from('garments')
                    .select('*')
                    .eq('garment_name', req.garmentName)
                    .single();

                if (items) {
                    const garment: Garment = {
                        id: items.id.toString(),
                        name: items.garment_name,
                        brand: items.brand_label,
                        imageUrl: items.image_endpoint,
                        type: 'Digital Twin',
                        gender: 'Unisex',
                        timestamp: items.created_at
                    };
                    setPendingGarment(garment);
                    setRequestSent(true);
                    setShowCodeInput(true);
                    localStorage.setItem(savedKey, JSON.stringify({ garment, requestSent: true, showCodeInput: true }));
                    setIsVerifying(false);
                    return;
                }
            }
        } catch (e) { console.error("Session reconstruction failed", e); }
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setShowCodeInput(false);
    setRequestSent(false);
    
    setTimeout(async () => {
      try {
        const dbItems = await dbService.getAllItems<any>('garments');
        const catalog: Garment[] = dbItems.map(item => ({
          id: item.id.toString(),
          name: item.garment_name,
          brand: item.brand_label,
          accessCode: item.security_pin,
          imageUrl: item.image_endpoint,
          type: 'Digital Twin',
          gender: 'Unisex',
          timestamp: item.created_at || new Date().toISOString()
        }));

        const product = catalog.length > 0 ? catalog[Math.floor(Math.random() * catalog.length)] : null;
        
        if (product) {
          setPendingGarment(product);
          if(user) {
             localStorage.setItem(`pending_scan_${user.email.toLowerCase()}`, JSON.stringify({ garment: product }));
          }
          setVerificationResult({ status: 'original', message: 'ITEM FOUND', details: 'Real clothing detected.' });
        } else {
          setPendingGarment(null);
          setVerificationResult({ status: 'unknown', message: 'Not Found', details: 'No items matching this tag.' });
        }
      } catch (err) {
        console.error("Scan Error", err);
        setVerificationResult({ status: 'unknown', message: 'System Error', details: 'Vault inaccessible.' });
      }
      setIsVerifying(false);
    }, 1200);
  };

  const handleRequestCode = async () => {
    if (!user || !pendingGarment) return;
    
    const request = {
      id: `REQ-${Date.now()}`,
      userId: user.email,
      userName: user.name,
      garmentName: pendingGarment.name,
      brand: pendingGarment.brand || 'AXSER',
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      const { error } = await dbService.supabase.from('requests').insert([request]);
      if (error) throw error;
      
      setRequestSent(true);
      setShowCodeInput(true);
      
      localStorage.setItem(`pending_scan_${user.email.toLowerCase()}`, JSON.stringify({
        garment: pendingGarment,
        requestSent: true,
        showCodeInput: true
      }));
      
      setShowRequestSentModal(true);
    } catch (e: any) {
      console.error("Request Send Error:", e.message);
      alert(`Failed to send request: ${e.message}`);
    }
  };

  const handleManualImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualAdd = async () => {
    if (!user) return;
    if (!manualName.trim() || !manualBrand.trim() || !manualImageUrl.trim()) {
      alert("Please fill in all fields.");
      return;
    }

    setIsSavingManual(true);
    try {
      const newGarment: Garment = {
        id: `MANUAL-${Date.now()}`,
        userId: user.email,
        name: manualName,
        brand: manualBrand,
        imageUrl: manualImageUrl,
        type: 'Personal Entry',
        gender: 'Unisex',
        timestamp: new Date().toISOString(),
        isManual: true
      };

      await dbService.saveItem('wardrobe', newGarment);
      setWardrobe(prev => [...prev, newGarment]);
      setShowManualModal(false);
      setShowSuccessModal(true);
      
      // Reset form
      setManualName('');
      setManualBrand('');
      setManualImageUrl('');
    } catch (err) {
      alert("Failed to save garment.");
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleLinkAsset = async () => {
    if (!user || !pendingGarment) return;
    
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(productCode)) {
      alert("Please enter exactly 6 numeric digits.");
      return;
    }

    try {
      const { data: items } = await dbService.supabase
        .from('garments')
        .select('*')
        .eq('garment_name', pendingGarment.name)
        .eq('brand_label', pendingGarment.brand)
        .single();

      if (items && productCode === items.security_pin) {
        const userGarment = {
          id: `USER-${Date.now()}-${pendingGarment.id}`,
          userId: user.email,
          name: pendingGarment.name,
          type: pendingGarment.type,
          imageUrl: pendingGarment.imageUrl,
          timestamp: new Date().toISOString(),
          gender: pendingGarment.gender,
          brand: pendingGarment.brand,
          accessCode: productCode,
          isManual: false
        };

        await dbService.saveItem('wardrobe', userGarment);
        
        try {
           await dbService.supabase
             .from('requests')
             .update({ status: 'resolved', resolvedCode: productCode })
             .eq('userId', user.email)
             .eq('garmentName', pendingGarment.name)
             .eq('status', 'pending');
        } catch(e) { }

        setWardrobe(prev => [...prev, userGarment as unknown as Garment]);
        localStorage.removeItem(`pending_scan_${user.email.toLowerCase()}`);
        
        setShowScanOverlay(false);
        setShowSuccessModal(true);
        
        setVerificationResult(null);
        setIsVerifying(false);
        setShowCodeInput(false);
        setProductCode('');
        setPendingGarment(null);
        setCountdown(0);
        setRequestSent(false);
      } else {
        alert("Invalid Security PIN. If you requested a code, please check your notifications for the correct one.");
      }
    } catch (e) {
      alert("Verification failed. Please try again.");
    }
  };

  const closeScanOverlay = () => {
      setShowScanOverlay(false);
  };

  const handleAuthSuccess = (u: User, adminFlag: boolean) => {
    setShowAuthModal(false);
    setCurrentView('home');
  };

  const handleSignOutTrigger = () => {
    setShowLogoutConfirm(true);
  };

  const confirmSignOut = async () => {
    try {
      setShowLogoutConfirm(false);
      await dbService.supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      const scanKeys: Record<string, string> = {};
      for(let i=0; i<localStorage.length; i++){
          const key = localStorage.key(i);
          if(key?.startsWith('pending_scan_')) {
              scanKeys[key] = localStorage.getItem(key)!;
          }
      }
      localStorage.clear(); 
      Object.entries(scanKeys).forEach(([k,v]) => localStorage.setItem(k, v));
      
      sessionStorage.clear();
      setUser(null); 
      setIsAdmin(false); 
      setWardrobe([]);
      setSavedOutfits([]);
      setNotifications([]);
      setCurrentView('home'); 
    }
  };

  const generateStyle = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (wardrobe.length === 0) {
      alert("Closet is empty. Scan items first.");
      return;
    }
    setIsStyling(true);
    setStyleAdvice(null);
    try {
      const advice = await geminiService.getStylingAdvice(wardrobe, occasionPrompt || "A stylish night out");
      const adviceWithUser = { ...advice, userId: user?.email || 'guest' };
      setStyleAdvice(adviceWithUser as StylingSuggestion);
      setOccasionPrompt('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsStyling(false);
    }
  };

  const handleRemoveGarment = async (id: string) => {
    const item = wardrobe.find(i => i.id === id);
    if (!item) return;

    // Strict Rule: Manual or AccessCode items cannot be deleted
    if (item.accessCode || item.isManual) {
      alert("Authenticated assets and manual archives are locked for permanent record.");
      return;
    }

    if (confirm("Remove this item from your vault?")) {
      await dbService.deleteItem('wardrobe', id);
      setWardrobe(prev => prev.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  useEffect(() => {
    const handleClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col">
      <Navbar 
        onHomeClick={() => setCurrentView('home')} 
        onScanClick={handleStartScan}
        onWardrobeClick={() => user ? setCurrentView('wardrobe') : setShowAuthModal(true)}
        onOutfitsClick={() => setCurrentView('outfits')}
        onStyleClick={() => {
          if (user) setCurrentView('ai-style');
          else setShowAuthModal(true);
        }}
        onNotificationsClick={() => {
          if (user) setCurrentView('notifications');
          else setShowAuthModal(true);
        }}
        onSignInClick={() => setShowAuthModal(true)}
        onSignOutClick={handleSignOutTrigger}
        onProfileClick={() => user ? setCurrentView('profile') : setShowAuthModal(true)}
        currentView={currentView} user={user} isAdmin={isAdmin}
        notifications={notifications}
      />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />}
      
      {showSuccessModal && (
        <div className="fixed inset-0 z-[130] overflow-y-auto">
            <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-xl" onClick={() => setShowSuccessModal(false)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[40px] p-10 flex flex-col items-center shadow-2xl animate-in slide-in-up">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6 shadow-lg shadow-green-500/10">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Success</h2>
                  <p className="text-[#606060] text-xs font-bold text-center mb-8 tracking-wide">Item added to your wardrobe.</p>
                  <button onClick={() => { setShowSuccessModal(false); if (currentView !== 'wardrobe') setCurrentView('wardrobe'); }} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg hover:bg-gray-200 transition-all">OK</button>
              </div>
            </div>
        </div>
      )}

      {/* Manual Entry Modal - Updated to overflow-y-auto to prevent "frozen" screen */}
      {showManualModal && (
        <div className="fixed inset-0 z-[110] overflow-y-auto">
          <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-xl" onClick={() => setShowManualModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-[#1A1A1A] rounded-[48px] border border-white/10 p-8 shadow-2xl animate-in slide-in-up my-auto">
              <h2 className="text-xl font-black uppercase mb-6 tracking-tighter text-center">Manual <span className="text-[#7B2CBF]">Entry</span></h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest ml-1">Product Name</label>
                  <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Vintage Denim Jacket" className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest ml-1">Brand Name</label>
                  <input type="text" value={manualBrand} onChange={(e) => setManualBrand(e.target.value)} placeholder="e.g. AXSER Originals" className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500 tracking-widest ml-1">Image URL</label>
                  <input type="text" value={manualImageUrl} onChange={(e) => setManualImageUrl(e.target.value)} placeholder="Paste link here..." className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" />
                </div>
                <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[8px] font-black uppercase text-[#444] tracking-widest">OR</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-[#111] border border-white/5 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-[#888] hover:text-white transition-all">Upload from Device</button>
                <input type="file" ref={fileInputRef} onChange={handleManualImageUpload} className="hidden" accept="image/*" />
                
                {manualImageUrl && (
                  <div className="w-full aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black mt-4">
                     <img src={manualImageUrl} className="w-full h-full object-cover" alt="Preview" onError={() => setManualImageUrl('')} />
                  </div>
                )}

                <div className="pt-4 flex flex-col gap-2">
                  <button onClick={handleManualAdd} disabled={isSavingManual} className="w-full bg-[#7B2CBF] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#8e3dfa] disabled:opacity-50">
                    {isSavingManual ? 'Archiving...' : 'Add to Wardrobe'}
                  </button>
                  <button onClick={() => setShowManualModal(false)} className="w-full text-[9px] font-black uppercase text-[#444] py-2">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Garment Details Popup - Updated to overflow-y-auto */}
      {viewingGarment && (
        <div className="fixed inset-0 z-[120] overflow-y-auto">
          <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-xl" onClick={() => setViewingGarment(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-[#1A1A1A] rounded-[48px] border border-white/10 overflow-hidden shadow-2xl animate-in slide-in-up my-auto">
              <button onClick={() => setViewingGarment(null)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-all z-10 border border-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex flex-col">
                <div className="aspect-[3/4] w-full bg-black overflow-hidden">
                  <img src={viewingGarment.imageUrl} className="w-full h-full object-cover" />
                </div>
                <div className="p-8 -mt-12 bg-[#1A1A1A] rounded-t-[48px] relative">
                  <div className="inline-block bg-[#7B2CBF] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 shadow-lg">
                    {viewingGarment.brand || 'Originals'}
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                    {viewingGarment.name}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
                      <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest block mb-1">Status</span>
                      <span className="text-white font-bold text-xs uppercase">{viewingGarment.accessCode ? 'Verified' : 'Manual'}</span>
                    </div>
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
                      <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest block mb-1">Source</span>
                      <span className="text-white font-bold text-xs uppercase">{viewingGarment.type}</span>
                    </div>
                  </div>

                  <div className="bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 mb-8">
                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest block mb-2">Vault Identifier</span>
                    <span className="text-white font-mono text-[10px] break-all opacity-50">{viewingGarment.id}</span>
                  </div>

                  <button onClick={() => setViewingGarment(null)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Close Details</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRequestSentModal && (
        <div className="fixed inset-0 z-[130] overflow-y-auto">
            <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-xl" onClick={() => setShowRequestSentModal(false)} />
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-white/10 rounded-[40px] p-10 flex flex-col items-center shadow-2xl animate-in slide-in-up">
                  <div className="w-20 h-20 bg-[#7B2CBF]/10 rounded-full flex items-center justify-center text-[#7B2CBF] mb-6 shadow-lg shadow-[#7B2CBF]/10">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Request Sent</h2>
                  <p className="text-[#606060] text-xs font-bold text-center mb-8 tracking-wide">Your request for an access code has been sent. Check your notifications for the approved PIN.</p>
                  <button onClick={() => setShowRequestSentModal(false)} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg hover:bg-gray-200 transition-all">OK</button>
              </div>
            </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[120] overflow-y-auto">
          <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-xl" onClick={() => setShowLogoutConfirm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-[#1A1A1A] rounded-[48px] border border-white/10 p-10 text-center shadow-2xl animate-in slide-in-up">
              <div className="w-16 h-16 bg-[#111111] rounded-2xl flex items-center justify-center text-[#7B2CBF] mx-auto mb-8 border border-white/5 shadow-xl">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3V7a3 3 0 013-3h4a3 3 0 013-3v1" />
                 </svg>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">End Session?</h2>
              <p className="text-[#606060] text-xs font-bold mb-10 leading-relaxed px-2 text-center text-balance">
                Are you sure you want to exit the vault? You will need to sign back in to access your collection.
              </p>
              <div className="space-y-3">
                <button onClick={confirmSignOut} className="w-full py-4 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg hover:bg-red-600 active:scale-95 transition-all">OK</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-transparent text-[#404040] font-black uppercase tracking-widest text-[9px] rounded-2xl hover:text-white transition-all">CANCEL</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanOverlay && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-xl" onClick={closeScanOverlay} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-[#1A1A1A] rounded-[48px] border border-white/10 p-8 text-center shadow-2xl animate-in slide-in-up my-auto">
              <button onClick={closeScanOverlay} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#404040] hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              <h1 className="text-xl font-black uppercase mb-6 tracking-tighter">Scan <span className="text-[#7B2CBF]">Clothes</span></h1>
              {isVerifying ? (
                <div className="w-24 h-24 mx-auto mb-8 flex items-center justify-center"><div className="w-full h-full rounded-full border-4 border-[#7B2CBF] border-t-transparent animate-spin" /></div>
              ) : pendingGarment ? (
                <div className="w-40 h-40 mx-auto mb-8 rounded-[40px] overflow-hidden border-2 border-[#7B2CBF] shadow-2xl"><img src={pendingGarment.imageUrl} className="w-full h-full object-cover" /></div>
              ) : (
                <div className="w-40 h-40 mx-auto mb-8 rounded-[40px] bg-[#0A0A0A] border border-white/5 flex items-center justify-center opacity-50"><span className="text-[10px] font-black uppercase text-[#303030]">Void</span></div>
              )}
              <div className="mb-8">
                {pendingGarment ? (
                  <>
                    <div className="animate-in fade-in mb-6">
                      <div className="text-[10px] font-black text-[#7B2CBF] uppercase tracking-[0.3em] mb-1">{pendingGarment.brand || 'Originals'}</div>
                      <h3 className="text-2xl font-black text-white uppercase mb-2 tracking-tighter">{pendingGarment.name}</h3>
                    </div>

                    {showCodeInput && (
                      <div className="space-y-4 animate-in slide-in-up">
                        <p className="text-[10px] font-black uppercase text-[#404040] tracking-widest mb-1">Enter Security PIN</p>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          maxLength={6} 
                          value={productCode} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setProductCode(val);
                            if (user) {
                               const savedStr = localStorage.getItem(`pending_scan_${user.email.toLowerCase()}`);
                               const saved = savedStr ? JSON.parse(savedStr) : {};
                               localStorage.setItem(`pending_scan_${user.email.toLowerCase()}`, JSON.stringify({ ...saved, showCodeInput: true }));
                            }
                          }} 
                          className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 text-center text-2xl font-black tracking-[0.4em] focus:border-[#7B2CBF] outline-none text-white shadow-inner" 
                          placeholder="000000" 
                        />
                        {!requestSent ? (
                          <button onClick={handleRequestCode} className="text-[9px] font-black uppercase tracking-[0.2em] text-[#7B2CBF] hover:text-[#9D4EDD] transition-colors underline decoration-dotted underline-offset-4">Request Access Code</button>
                        ) : (
                           <div className="flex flex-col items-center gap-1">
                               <p className="text-[9px] font-black uppercase tracking-[0.2em] text-green-500">Request Pending</p>
                               <p className="text-[8px] font-bold text-gray-500">Check notifications for the approved PIN.</p>
                               <button onClick={() => {
                                  setRequestSent(false);
                                  if (user) {
                                     const savedStr = localStorage.getItem(`pending_scan_${user.email.toLowerCase()}`);
                                     const saved = savedStr ? JSON.parse(savedStr) : {};
                                     localStorage.setItem(`pending_scan_${user.email.toLowerCase()}`, JSON.stringify({ ...saved, requestSent: false }));
                                  }
                               }} className="text-[8px] text-[#444] uppercase tracking-widest mt-2 hover:text-white">Retry Request</button>
                           </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="animate-in fade-in">
                    <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight">{verificationResult?.message || 'Searching...'}</h3>
                    <p className="text-[#404040] text-[10px] font-black uppercase tracking-widest">{verificationResult?.details}</p>
                  </div>
                )}
              </div>
              <div className="space-y-3 pt-4 border-t border-white/5">
                {pendingGarment && (
                  <button 
                    onClick={() => { 
                      if(!user) { 
                        setShowScanOverlay(false); 
                        setShowAuthModal(true); 
                      } else if(!showCodeInput) {
                        setShowCodeInput(true); 
                        const savedStr = localStorage.getItem(`pending_scan_${user.email.toLowerCase()}`);
                        const saved = savedStr ? JSON.parse(savedStr) : {};
                        localStorage.setItem(`pending_scan_${user.email.toLowerCase()}`, JSON.stringify({ ...saved, showCodeInput: true }));
                      } else {
                        handleLinkAsset(); 
                      }
                    }} 
                    className="w-full bg-[#7B2CBF] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all hover:bg-[#8e3dfa]"
                  >
                    {user ? (showCodeInput ? 'Verify PIN & Add' : 'Verify Ownership') : 'Add to Wardrobe'}
                  </button>
                )}
                <button onClick={closeScanOverlay} className="w-full bg-transparent text-[#404040] py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:text-white transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col relative pt-24 min-h-screen">
        {isAdmin && currentView === 'profile' ? (
          <div key="admin-profile" className="animate-in slide-in-up w-full">
            <AdminDashboard />
          </div>
        ) : currentView === 'notifications' && user ? (
          <div key="notifications-view" className="animate-in slide-in-up w-full">
            <NotificationsView 
              notifications={notifications} 
              onMarkRead={(id) => dbService.markNotificationRead(id)}
              onClearAll={async () => {
                if (confirm("Clear notification log?")) {
                  await dbService.supabase.from('notifications').delete().eq('userId', user.email);
                  setNotifications([]);
                }
              }}
            />
          </div>
        ) : currentView === 'profile' && user ? (
          <div key="user-profile" className="animate-in slide-in-up w-full">
            <ProfileView 
              user={user} 
              wardrobeCount={wardrobe.length} 
              outfitsCount={savedOutfits.length} 
              totalScans={wardrobe.length + 1} 
              styleScore={98} 
              onUpdateAvatar={() => {}} 
              onUpdateUser={() => {}} 
              onSignOut={handleSignOutTrigger} 
            />
          </div>
        ) : currentView === 'wardrobe' ? (
           <div key="wardrobe" className="max-w-6xl mx-auto px-6 py-12 animate-in slide-in-up w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
              <div>
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">{user?.name.split(' ')[0]}'s <span className="text-[#7B2CBF]">Vault</span></h1>
                <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Verified digital twin collection</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setShowManualModal(true)} className="bg-[#111] border border-white/5 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-white/10 transition-colors">Manual Entry</button>
                 <button onClick={handleStartScan} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-gray-200 transition-colors">Scan NFC</button>
              </div>
            </div>
            {isLoadingWardrobe ? (
              <div className="py-40 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-[#7B2CBF] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#333] font-black uppercase tracking-widest text-[10px]">Accessing Vault Data...</p>
              </div>
            ) : wardrobe.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {wardrobe.map(item => (
                  <div key={item.id} onClick={() => setViewingGarment(item)} className="group relative bg-[#111111] border border-white/5 rounded-[40px] overflow-hidden transition-all hover:border-[#7B2CBF]/40 shadow-2xl cursor-pointer">
                    <div className="aspect-[3/4] overflow-hidden bg-black relative">
                      <img src={item.imageUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-all z-20"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg></button>
                      {activeMenuId === item.id && (
                        <div className="absolute top-14 right-4 w-40 bg-[#1A1A1A] border border-white/10 rounded-2xl p-2 shadow-2xl z-30 animate-in slide-in-up" onClick={(e) => e.stopPropagation()}>
                          <button 
                            disabled={!!item.accessCode || !!item.isManual}
                            onClick={() => handleRemoveGarment(item.id)} 
                            className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${item.accessCode || item.isManual ? 'opacity-30 cursor-not-allowed text-gray-400' : 'hover:bg-red-500/10 text-red-500'}`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                            {item.accessCode || item.isManual ? 'LOCKED' : 'Remove'}
                          </button>
                        </div>
                      )}
                      
                      {/* Product Type Badge */}
                      <div className="absolute bottom-4 left-4 z-10 px-3 py-1 bg-black/50 backdrop-blur-md border border-white/5 rounded-full">
                         <span className="text-[8px] font-black uppercase tracking-widest text-white/70">
                            {item.accessCode ? 'Authenticated' : 'Manual Archive'}
                         </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-[10px] font-black text-[#7B2CBF] uppercase tracking-widest mb-1">{item.brand || 'Originals'}</div>
                      <div className="text-white font-bold text-lg leading-tight">{item.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center bg-[#111111] border border-white/5 rounded-[48px] border-dashed"><p className="text-[#333333] font-black uppercase tracking-[0.6em] text-sm">Your vault is empty</p></div>
            )}
           </div>
        ) : currentView === 'ai-style' ? (
           <div key="ai-style" className="max-w-4xl mx-auto px-6 py-12 animate-in slide-in-up w-full">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">AI <span className="text-[#7B2CBF]">Style</span></h1>
              <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[10px]">Wardrobe Intelligence Engine</p>
            </div>
            <div className="bg-[#111111] border border-white/5 rounded-[48px] p-8 md:p-12 shadow-2xl mb-12">
               <div className="flex flex-col md:flex-row gap-4">
                  <input type="text" value={occasionPrompt} onChange={(e) => setOccasionPrompt(e.target.value)} placeholder="Where are you going?" className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 text-white font-bold focus:border-[#7B2CBF] outline-none" />
                  <button onClick={generateStyle} disabled={isStyling} className="bg-[#7B2CBF] text-white px-12 py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl disabled:opacity-50">{isStyling ? 'Analyzing...' : 'Generate Look'}</button>
               </div>
               <div className="flex flex-wrap gap-2 mt-6 justify-center">
                  {['Business Lunch', 'Techno Party', 'Beach Wedding', 'Art Gallery'].map(t => (
                    <button key={t} onClick={() => setOccasionPrompt(t)} className="px-4 py-2 bg-[#0A0A0A] border border-white/5 rounded-full text-[9px] font-black uppercase text-[#444444] hover:text-[#7B2CBF] transition-colors">{t}</button>
                  ))}
               </div>
            </div>
            {styleAdvice && (
              <div className="animate-in slide-in-up space-y-12">
                 <div className="bg-[#1A1A1A] border border-white/10 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#7B2CBF]/5 blur-[100px] -mr-32 -mt-32" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-4">{styleAdvice.title}</h2>
                    <p className="text-gray-400 font-medium text-lg leading-relaxed mb-10 max-w-2xl">{styleAdvice.advice}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {styleAdvice.combination.map((item, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-white/5 p-4 rounded-3xl">
                          <div className="text-[#7B2CBF] font-black text-[9px] uppercase tracking-widest mb-1">Pick {i+1}</div>
                          <div className="text-white font-bold text-sm">{item}</div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            )}
           </div>
        ) : (
          <div key="home" className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-in slide-in-up">
            <div className="text-center mb-16">
              <h1 className="text-[50px] md:text-[110px] font-black uppercase tracking-tighter leading-none mb-4">AXSER<span className="text-[#7B2CBF]">.IO</span></h1>
              {user && <p className="text-[#7B2CBF] text-lg font-black uppercase tracking-[0.5em] mb-6">Welcome back, {user.name.split(' ')[0]}</p>}
              <p className="text-gray-400 text-base md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed opacity-80">The future of authenticated fashion. Tap, verify, and unlock AI-powered style intelligence.</p>
            </div>
            
            {!isAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[1000px] [animation-delay:200ms]">
                <div onClick={handleStartScan} className="group relative bg-[#111111] border border-white/5 h-[300px] md:h-[420px] rounded-[48px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#7B2CBF]/40 shadow-2xl">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1A1A1A] rounded-full flex items-center justify-center text-[#7B2CBF] mb-8 border border-white/5 transition-transform group-hover:scale-110">
                    <ScanIcon />
                  </div>
                  <h3 className="text-white text-2xl md:text-3xl font-black uppercase tracking-tighter">Scan</h3>
                  <p className="text-[#444444] text-xs md:text-sm font-bold uppercase mt-4 tracking-widest">Verify authenticity instantly</p>
                </div>
                <div onClick={() => { if (user) setCurrentView('ai-style'); else setShowAuthModal(true); }} className="group relative bg-[#111111] border border-white/5 h-[300px] md:h-[420px] rounded-[48px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#7B2CBF]/40 shadow-2xl">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1A1A1A] rounded-full flex items-center justify-center text-[#7B2CBF] mb-8 border border-white/5 transition-transform group-hover:scale-110">
                    <StyleIcon />
                  </div>
                  <h3 className="text-white text-2xl md:text-3xl font-black uppercase tracking-tighter">AI Style</h3>
                  <p className="text-[#444444] text-xs md:text-sm font-bold uppercase mt-4 tracking-widest">Get smart look suggestions</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                 <button 
                   onClick={() => setCurrentView('profile')}
                   className="group relative bg-[#111111] border border-[#7B2CBF]/20 px-12 py-8 rounded-[48px] flex items-center gap-6 cursor-pointer transition-all hover:border-[#7B2CBF]/60 shadow-2xl"
                 >
                   <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center text-[#7B2CBF] border border-white/5 group-hover:scale-105 transition-transform">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                   </div>
                   <div className="text-left">
                     <h3 className="text-white text-2xl font-black uppercase tracking-tighter">Registry Console</h3>
                     <p className="text-[#444444] text-xs font-bold uppercase mt-1 tracking-widest">Manage Inventory & Requests</p>
                   </div>
                 </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
