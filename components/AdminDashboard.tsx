
import React, { useState, useEffect, useCallback } from 'react';
import { AccessRequest, Notification } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface GarmentDB {
  id: string; 
  garment_name: string;
  brand_label: string;
  security_pin: string;
  image_endpoint: string;
  created_at?: string;
  syncStatus?: 'synced' | 'pushing' | 'error';
}

const AdminDashboard: React.FC = () => {
  const [catalog, setCatalog] = useState<GarmentDB[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests'>('inventory');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewingProduct, setViewingProduct] = useState<GarmentDB | null>(null);
  const [resolutionPins, setResolutionPins] = useState<Record<string, string>>({});

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorStatus(null);

    try {
      const { data: items, error: fetchError } = await dbService.supabase
        .from('garments')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        if (fetchError.code === 'PGRST205') {
            setErrorStatus("Table 'garments' missing. Run SQL setup.");
        }
        throw fetchError;
      }
      
      const rawReqs = await dbService.getAllItems<any>('requests');
      const reqs: AccessRequest[] = rawReqs.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        garmentName: r.garmentName,
        brand: r.brand,
        timestamp: r.timestamp,
        status: r.status,
        resolvedCode: r.resolvedCode
      }));

      const syncedItems: GarmentDB[] = (items || []).map(i => ({ 
        ...i, 
        syncStatus: 'synced' as const 
      }));
      setCatalog(syncedItems);
      setRequests((reqs || []).sort((a, b) => b.timestamp - a.timestamp));

      const pins: Record<string, string> = {};
      (reqs || []).forEach(req => {
        if (req.status === 'pending') {
          const matchingItem = (items || []).find(i => 
            i.garment_name.toLowerCase().trim() === req.garmentName.toLowerCase().trim()
          );
          if (matchingItem?.security_pin) {
            pins[req.id] = matchingItem.security_pin;
          }
        }
      });
      setResolutionPins(prev => ({ ...prev, ...pins }));
    } catch (err: any) {
      console.error("Admin Load Error", err);
      // Only set error if it wasn't a signal abort which is handled by browser/client
      if (err.name !== 'AbortError') {
        setErrorStatus(err.message || "Connection Error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []); // Removed errorStatus dependency to fix loop and AbortErrors

  useEffect(() => {
    loadData();
    const garmentSubscription = dbService.supabase
      .channel('garments-realtime-admin-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'garments' }, () => {
        loadData();
      })
      .subscribe();

    const requestSubscription = dbService.supabase
      .channel('requests-realtime-admin-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      dbService.supabase.removeChannel(garmentSubscription);
      dbService.supabase.removeChannel(requestSubscription);
    };
  }, [loadData]);

  const resetForm = () => {
    setName('');
    setBrand('');
    setAccessCode('');
    setImageUrl('');
    setEditingId(null);
    setIsSubmitting(false);
  };

  const handleSaveGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim() || !accessCode.trim() || !imageUrl.trim()) {
      alert("All fields are mandatory for registry.");
      return;
    }
    const cleanPin = accessCode.trim();
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(cleanPin)) {
      alert("Security PIN must be exactly 6 numeric digits.");
      return;
    }
    setIsSubmitting(true);
    const payload = {
      garment_name: name.trim(),
      brand_label: brand.trim(),
      security_pin: cleanPin,
      image_endpoint: imageUrl.trim()
    };
    try {
      let response;
      if (editingId) {
        response = await dbService.supabase.from('garments').update(payload).eq('id', editingId);
      } else {
        response = await dbService.supabase.from('garments').insert([payload]);
      }
      if (response.error) throw response.error;
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (item: GarmentDB) => {
    setName(item.garment_name);
    setBrand(item.brand_label);
    setAccessCode(item.security_pin);
    setImageUrl(item.image_endpoint);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Permanently remove this asset?")) {
      dbService.supabase.from('garments').delete().eq('id', id).then(({error}) => {
        if (error) alert(error.message);
        else loadData();
      });
    }
  };

  const handleAuthorize = async (req: AccessRequest, code: string) => {
    if(!code.trim()) {
      alert("Please provide a PIN code.");
      return;
    }
    
    try {
      // Use update instead of upsert to avoid NOT NULL constraint issues with partial updates
      const { error: reqError } = await dbService.supabase
        .from('requests')
        .update({ status: 'resolved', resolvedCode: code })
        .eq('id', req.id);

      if (reqError) throw reqError;
      
      const notif = {
        id: 'NOTIF-' + Date.now(),
        userId: req.userId,
        title: 'Access Approved',
        message: `Your code for ${req.garmentName} is approved. PIN: ${code}. You can now add the item to your vault.`,
        timestamp: Date.now(),
        isRead: false,
        type: 'code_received'
      };
      const { error: notifError } = await dbService.supabase.from('notifications').upsert(notif);
      if (notifError) throw notifError;
      loadData();
    } catch (err: any) {
      alert(`Authorization Error: ${err.message}`);
    }
  };

  const handleDeny = async (req: AccessRequest) => {
    try {
      // Use update instead of upsert to avoid NOT NULL constraint issues with partial updates
      const { error: reqError } = await dbService.supabase
        .from('requests')
        .update({ status: 'denied' })
        .eq('id', req.id);

      if (reqError) throw reqError;

      const notif = {
        id: 'NOTIF-' + Date.now(),
        userId: req.userId,
        title: 'Access Denied',
        message: `Your request for ${req.garmentName} (${req.brand}) was not approved.`,
        timestamp: Date.now(),
        isRead: false,
        type: 'request_denied'
      };
      const { error: notifError } = await dbService.supabase.from('notifications').upsert(notif);
      if (notifError) throw notifError;
      loadData();
    } catch (err: any) {
      alert(`Denial Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 pt-4 px-4 md:px-6 flex flex-col items-center">
      {viewingProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-md" onClick={() => setViewingProduct(null)} />
          <div className="relative w-full max-w-sm bg-[#1A1A1A] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl animate-in">
            <button onClick={() => setViewingProduct(null)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col">
              <div className="aspect-[4/3] w-full bg-black relative">
                <img src={viewingProduct.image_endpoint} className="w-full h-full object-cover" alt={viewingProduct.garment_name} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
              </div>
              <div className="p-6 -mt-6 relative">
                <div className="inline-block bg-[#7B2CBF] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-3 shadow-lg">{viewingProduct.brand_label}</div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{viewingProduct.garment_name}</h2>
                <div className="grid grid-cols-2 gap-3 bg-[#0D0D0D] border border-white/5 rounded-2xl p-4 mb-6">
                  <div>
                    <span className="text-[8px] font-black uppercase text-[#444] tracking-widest block mb-0.5">Asset ID</span>
                    <span className="text-white font-mono text-[10px] truncate block">{viewingProduct.id.slice(0, 8)}...</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-[#444] tracking-widest block mb-0.5">Security PIN</span>
                    <span className="text-[#7B2CBF] font-mono text-sm font-black">{viewingProduct.security_pin}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { handleEditClick(viewingProduct); setViewingProduct(null); }} className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all">Edit</button>
                  <button onClick={() => setViewingProduct(null)} className="flex-1 py-3 bg-[#7B2CBF] text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg">Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section Centered */}
      <div className="w-full max-w-2xl flex flex-col items-center mb-12 text-center">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-4xl md:text-6xl font-black uppercase text-white tracking-tighter leading-none">
            REGISTRY <span className="text-[#7B2CBF]">VAULT</span>
          </h1>
          <button 
            onClick={() => loadData(true)} 
            disabled={isRefreshing || isLoading}
            className="w-10 h-10 bg-[#111] border border-white/5 rounded-full flex items-center justify-center hover:bg-white/5 transition-all"
          >
            <svg className={`w-5 h-5 text-[#7B2CBF] ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
            </svg>
          </button>
        </div>
        <p className="text-[#666] font-black uppercase tracking-[0.4em] text-[10px] md:text-[11px] mb-4">Inventory Management & Authentication Logs</p>
        
        {errorStatus && (
          <p className="text-red-500 font-black text-[10px] uppercase tracking-widest mb-6 animate-pulse">
            {errorStatus.toUpperCase()}
          </p>
        )}

        {/* Tab Switcher Centered */}
        <div className="w-full max-w-sm bg-[#111111]/80 backdrop-blur-md border border-white/5 rounded-3xl p-1.5 flex gap-1.5 shadow-2xl">
          <button 
            onClick={() => setActiveTab('inventory')} 
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'inventory' ? 'bg-[#7B2CBF] text-white shadow-xl shadow-[#7B2CBF]/20' : 'text-[#555] hover:text-[#888]'}`}
          >
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('requests')} 
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all relative ${activeTab === 'requests' ? 'bg-[#7B2CBF] text-white shadow-xl shadow-[#7B2CBF]/20' : 'text-[#555] hover:text-[#888]'}`}
          >
            Logs
            {requests.some(r => r.status === 'pending') && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-[#7B2CBF] rounded-full animate-pulse border-2 border-[#111]" />
            )}
          </button>
        </div>
      </div>

      <div className="w-full">
        {activeTab === 'inventory' ? (
          <div key="inventory-tab" className="grid grid-cols-1 xl:grid-cols-12 gap-10 w-full">
            <div className="xl:col-span-4 order-2 xl:order-1">
              <div className="bg-[#111111] border border-white/5 rounded-[40px] p-8 shadow-2xl h-fit sticky top-28">
                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-8">
                    {editingId ? 'Modify Record' : 'Add Asset'}
                </h2>
                <form onSubmit={handleSaveGarment} className="space-y-6">
                  <AdminInput label="Product Name" value={name} onChange={setName} placeholder="Signature Hoodie" />
                  <AdminInput label="Label / Brand" value={brand} onChange={setBrand} placeholder="AXSER Originals" />
                  <AdminInput label="Security PIN" value={accessCode} onChange={setAccessCode} placeholder="6 DIGITS ONLY" type="text" inputMode="numeric" />
                  <AdminInput label="Image Endpoint" value={imageUrl} onChange={setImageUrl} placeholder="Direct Image URL" />
                  <div className="pt-4">
                    <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-[#7B2CBF] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#8e3dfa] transition-all active:scale-95 disabled:opacity-50 shadow-xl">
                        {isSubmitting ? 'Syncing...' : (editingId ? 'Update Asset' : 'Register Asset')}
                    </button>
                    {editingId && (
                      <button type="button" onClick={resetForm} className="w-full mt-4 py-2 text-[#444] font-black uppercase text-[9px] tracking-widest hover:text-white transition-colors">Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            </div>
            
            <div className="xl:col-span-8 space-y-4 order-1 xl:order-2">
              <div className="flex justify-between items-center px-4 mb-4">
                 <h2 className="text-[10px] font-black uppercase text-[#444] tracking-[0.4em]">MASTER REGISTRY ({catalog.length})</h2>
                 <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-orange-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`} />
                   <span className="text-[9px] font-black uppercase text-[#444] tracking-widest">{isRefreshing ? 'SYNCING...' : 'CONNECTED'}</span>
                 </div>
              </div>

              <div className="bg-[#111111] border border-white/5 rounded-[40px] p-6 min-h-[500px] overflow-hidden">
                {isLoading && !isRefreshing ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-[#7B2CBF] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase text-[#333] tracking-widest">Accessing Vault...</span>
                    </div>
                  ) : catalog.length === 0 ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-40">
                      <span className="text-[10px] font-black uppercase text-[#333] tracking-[0.6em]">REGISTRY EMPTY</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catalog.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => setViewingProduct(item)}
                          className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-4 flex items-center gap-4 hover:border-[#7B2CBF]/30 transition-all cursor-pointer group"
                        >
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                            <img src={item.image_endpoint} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-black text-xs uppercase truncate mb-1">{item.garment_name}</h4>
                            <span className="text-[9px] font-black uppercase text-[#444] tracking-widest block">{item.brand_label}</span>
                            <span className="text-[#7B2CBF] font-mono text-[10px] font-black block mt-1">PIN: {item.security_pin}</span>
                          </div>
                          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleEditClick(item)} className="p-2.5 text-[#7B2CBF] hover:bg-[#7B2CBF]/10 rounded-xl transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" strokeWidth={2.5} /></svg>
                            </button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2.5} /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        ) : (
          <div key="logs-tab" className="space-y-6 max-w-4xl mx-auto w-full animate-in">
             <div className="flex justify-between items-center px-4 mb-2">
                 <h2 className="text-[10px] font-black uppercase text-[#444] tracking-[0.4em]">AUTHENTICATION LOGS ({requests.length})</h2>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                   <span className="text-[9px] font-black uppercase text-[#444] tracking-widest">LIVE LOGGING</span>
                 </div>
              </div>

            <div className="bg-[#111111] border border-white/5 rounded-[40px] p-6 min-h-[500px]">
              {requests.length === 0 ? (
                <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-40">
                  <span className="text-[10px] font-black uppercase text-[#333] tracking-[0.6em]">NO LOGS FOUND</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(req => (
                    <div key={req.id} className={`bg-[#0A0A0A] border border-white/5 p-6 rounded-3xl shadow-xl transition-all ${req.status !== 'pending' ? 'opacity-50' : 'border-l-4 border-l-[#7B2CBF]'}`}>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5 flex-1">
                          <div className="w-14 h-14 shrink-0 bg-[#111] rounded-2xl border border-white/10 flex items-center justify-center text-[#7B2CBF] font-black text-2xl uppercase">
                            {req.userName?.[0] || 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="text-white font-black text-sm uppercase tracking-tight truncate">
                              {req.userName} <span className="text-[#444] font-normal ml-1">({req.userId})</span>
                            </h3>
                            <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Item: {req.garmentName}</div>
                            <div className="text-[8px] text-[#444] font-black uppercase mt-2.5 flex items-center gap-4">
                              <span className={req.status === 'pending' ? 'text-[#7B2CBF] animate-pulse' : req.status === 'denied' ? 'text-red-500' : 'text-green-500'}>
                                {req.status.toUpperCase()}
                              </span>
                              <span className="opacity-50">{new Date(req.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {req.status === 'pending' && (
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <input 
                              type="text" 
                              inputMode="numeric"
                              value={resolutionPins[req.id] || ''} 
                              onChange={(e) => setResolutionPins(prev => ({ ...prev, [req.id]: e.target.value.replace(/\D/g, '') }))} 
                              placeholder="PIN" 
                              maxLength={6}
                              className="w-24 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-center text-xs outline-none focus:border-[#7B2CBF]" 
                            />
                            <button 
                              onClick={() => handleAuthorize(req, resolutionPins[req.id] || '')} 
                              className="bg-[#7B2CBF] text-white px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-[#8e3dfa] shadow-lg"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleDeny(req)} 
                              className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        )}
                        {req.status === 'resolved' && (
                          <div className="bg-[#111] border border-white/5 px-6 py-3 rounded-2xl">
                            <span className="text-white font-mono font-black text-xs">PIN: {req.resolvedCode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; type?: string; inputMode?: "numeric" | "search" | "text" | "none" | "tel" | "url" | "email" | "decimal" }> = ({ label, value, onChange, placeholder, disabled, type = "text", inputMode }) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black uppercase text-[#555] tracking-widest ml-2">{label}</label>
    <input 
      type={type} 
      inputMode={inputMode}
      value={value} 
      onChange={e => onChange(e.target.value)} 
      placeholder={placeholder} 
      disabled={disabled} 
      className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4.5 px-6 text-xs font-black text-white outline-none focus:border-[#7B2CBF] transition-all disabled:opacity-50" 
    />
  </div>
);

export default AdminDashboard;
