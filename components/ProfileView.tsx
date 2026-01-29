
import React, { useState, useCallback, useRef } from 'react';
import { User } from '../types.ts';
import Cropper from 'react-easy-crop';

interface ProfileViewProps {
  user: User;
  wardrobeCount: number;
  outfitsCount: number;
  totalScans: number;
  styleScore: number;
  onUpdateAvatar: (url: string) => void;
  onUpdateUser: (updatedUser: User) => void;
  onSignOut: () => void;
}

type IdentitySubView = 'main' | 'edit-username' | 'edit-bio' | 'edit-avatar' | 'edit-password' | 'delete-account';

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, 
  wardrobeCount, 
  outfitsCount, 
  totalScans, 
  styleScore, 
  onUpdateAvatar,
  onUpdateUser,
  onSignOut
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'security'>('profile');
  const [identitySubView, setIdentitySubView] = useState<IdentitySubView>('main');
  
  const [editUsername, setEditUsername] = useState(user.name);
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editAvatar, setEditAvatar] = useState(user.avatar || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return canvas.toDataURL('image/jpeg');
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
      setIsCropping(true);
    }
  };

  const handleSaveCroppedImage = async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        if (croppedImage) {
          setEditAvatar(croppedImage);
          onUpdateUser({ ...user, avatar: croppedImage });
          setSaveStatus('Photo saved');
          setIsCropping(false);
          setImageSrc(null);
          setIdentitySubView('main');
          setTimeout(() => setSaveStatus(null), 3000);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveIdentity = () => {
    onUpdateUser({ ...user, name: editUsername, bio: editBio, avatar: editAvatar });
    setSaveStatus('Saved');
    setIdentitySubView('main');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleDeleteAccount = () => {
    onSignOut();
    alert("Account deleted.");
  };

  if (isSettingsOpen) {
    return (
      <div className="max-w-4xl mx-auto animate-in slide-in-up pb-20 px-4">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => {
              if (isCropping) {
                setIsCropping(false);
                setImageSrc(null);
              } else if (identitySubView !== 'main') {
                setIdentitySubView('main');
              } else {
                setIsSettingsOpen(false);
              }
              setSaveStatus(null);
            }}
            className="w-12 h-12 rounded-2xl bg-[#1E1E1E] flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-[#F5F5F5]">
            {isCropping ? 'Cut Photo' : 
             identitySubView === 'edit-username' ? 'Edit Name' : 
             identitySubView === 'edit-bio' ? 'Edit Bio' : 
             identitySubView === 'edit-avatar' ? 'New Photo' : 
             identitySubView === 'edit-password' ? 'New Password' :
             identitySubView === 'delete-account' ? 'Delete' : 'Settings'}
          </h1>
        </div>

        <div className="bg-[#1E1E1E] border border-white/5 rounded-[32px] p-8 sm:p-10 shadow-sm transition-all duration-300 min-h-[400px] flex flex-col">
            {saveStatus && (
              <div className="mb-6 p-4 bg-[#7B2CBF]/10 border border-[#7B2CBF]/30 rounded-2xl text-[#7B2CBF] text-xs font-bold animate-in fade-in">
                {saveStatus}
              </div>
            )}

            {identitySubView === 'main' && (
              <div className="animate-in fade-in space-y-4">
                <div className="flex bg-[#121212] rounded-xl p-1 mb-6 border border-white/5">
                  <button onClick={() => setSettingsTab('profile')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${settingsTab === 'profile' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>My Info</button>
                  <button onClick={() => setSettingsTab('security')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${settingsTab === 'security' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Security</button>
                </div>

                {settingsTab === 'profile' ? (
                  <>
                    <div onClick={() => setIdentitySubView('edit-avatar')} className="w-full bg-[#121212] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-[#7B2CBF] p-0.5 overflow-hidden">
                          <img src={user.avatar} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Photo</span>
                          <span className="text-[#F5F5F5] font-bold text-xs">Change photo</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </div>
                    <div onClick={() => setIdentitySubView('edit-username')} className="w-full bg-[#121212] hover:bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer group">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Name</span>
                        <span className="text-[#F5F5F5] font-bold">{user.name}</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full bg-[#121212] border border-white/5 rounded-2xl p-5 flex flex-col justify-center opacity-70">
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Email</span>
                      <span className="text-gray-400 font-bold">{user.email}</span>
                    </div>
                    <div onClick={() => setIdentitySubView('delete-account')} className="w-full bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer group">
                      <span className="text-red-500 font-bold uppercase tracking-tight text-xs">Delete My Account</span>
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </div>
                  </>
                )}
              </div>
            )}

            {identitySubView === 'edit-avatar' && (
               <div className="animate-in slide-in-up flex flex-col flex-1">
               {!isCropping ? (
                 <div className="space-y-8 flex flex-col items-center justify-center flex-1">
                   <div className="w-48 h-48 rounded-full border-4 border-[#7B2CBF] p-1 shadow-2xl relative overflow-hidden group">
                     <img src={editAvatar} className="w-full h-full object-cover rounded-full" />
                   </div>
                   <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={onFileChange} />
                   <button onClick={() => fileInputRef.current?.click()} className="w-full bg-[#7B2CBF] text-white px-8 py-5 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all">Pick Photo</button>
                 </div>
               ) : (
                 <div className="flex flex-col flex-1 h-full min-h-[450px]">
                   <div className="relative flex-1 bg-black rounded-2xl overflow-hidden mb-6">
                     {imageSrc && (
                       <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                     )}
                   </div>
                   <div className="space-y-6">
                     <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e: any) => setZoom(e.target.value)} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7B2CBF]" />
                     <div className="flex gap-4">
                       <button onClick={() => { setIsCropping(false); setImageSrc(null); }} className="flex-1 bg-white/5 border border-white/10 text-white px-8 py-5 rounded-2xl font-black uppercase text-xs">Cancel</button>
                       <button onClick={handleSaveCroppedImage} className="flex-[2] bg-[#7B2CBF] text-white px-8 py-5 rounded-2xl font-black uppercase text-sm">Save</button>
                     </div>
                   </div>
                 </div>
               )}
             </div>
            )}

            {identitySubView === 'edit-username' && (
              <div className="animate-in slide-in-up">
                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Name</label>
                        <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-[#F5F5F5] font-bold outline-none focus:border-[#7B2CBF] transition-all" autoFocus />
                    </div>
                    <button onClick={handleSaveIdentity} className="w-full bg-[#7B2CBF] text-white px-8 py-5 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all">Save</button>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-in slide-in-up pb-20 px-4">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
        <div className="w-32 h-32 rounded-full border-4 border-[#7B2CBF] p-1 overflow-hidden shadow-xl">
          <img src={user.avatar} className="w-full h-full object-cover rounded-full" />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-4xl font-bold mb-1 text-[#F5F5F5]">{user.name}</h1>
          {user.bio && <p className="text-gray-400 text-sm mb-3 max-w-md italic">"{user.bio}"</p>}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-2">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7B2CBF]/10 text-[#7B2CBF] text-xs font-bold uppercase tracking-wider">Member</div>
            <span className="text-gray-500 text-sm font-medium">Joined {user.memberSince}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard value={wardrobeCount.toString()} label="Items" />
        <StatCard value={outfitsCount.toString()} label="Looks" />
        <StatCard value={totalScans.toString()} label="Scans" />
        <StatCard value={`${styleScore}%`} label="Score" />
      </div>

      <div className="space-y-3">
        <ListItem label="Settings" onClick={() => { setSettingsTab('profile'); setIdentitySubView('main'); setIsSettingsOpen(true); }} />
        <ListItem label="Logout" onClick={onSignOut} />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="bg-[#1E1E1E] border border-white/5 rounded-[24px] p-8 flex flex-col items-center justify-center shadow-sm hover:border-white/10 transition-colors">
    <div className="text-4xl font-black mb-1 text-[#F5F5F5]">{value}</div>
    <div className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{label}</div>
  </div>
);

const ListItem: React.FC<{ label: string; count?: number; onClick?: () => void }> = ({ label, count, onClick }) => (
  <button onClick={onClick} className="w-full bg-[#1E1E1E] hover:bg-[#252525] border border-white/5 rounded-2xl p-5 flex items-center justify-between transition-all shadow-sm text-[#F5F5F5] font-bold uppercase tracking-tight text-sm">
    <span>{label}</span>
    <div className="flex items-center gap-3">
      {count !== undefined && <span className="bg-[#7B2CBF] px-3 py-1 rounded-lg text-xs font-black text-white">{count}</span>}
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
    </div>
  </button>
);

export default ProfileView;
