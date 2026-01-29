
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types.ts';
import { dbService } from '../services/dbService.ts';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: User, isAdmin: boolean) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [otpDigits, setOtpDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(120);

  // Robust timer logic: starts only when in 'otp' step and handles its own lifecycle
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]); // Only restart if the step changes

  const validateEmail = (email: string) => {
    return String(email).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const handleAction = async () => {
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 'signin') {
        const { data, error: authError } = await dbService.supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (authError) throw authError;

        if (data.user) {
          const isAdmin = data.user.email === 'pnradm9@gmail.com';
          const profile = await dbService.getProfile(data.user.id);

          onSuccess({
            name: profile?.username || data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'Member',
            email: data.user.email!,
            memberSince: profile?.member_since || '2024',
            bio: profile?.bio || '',
            avatar: profile?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
            role: isAdmin ? 'admin' : 'user'
          }, isAdmin);
        }
      } else {
        if (!email.trim() || !validateEmail(email)) throw new Error("Enter a valid email.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be 6+ characters.");
        if (!username.trim()) throw new Error("Username is required.");

        const { error: authError } = await dbService.supabase.auth.signUp({
          email: email,
          password: password,
          options: { data: { username: username } }
        });

        if (authError) throw authError;

        setStep('otp');
        setTimer(120);
        setOtpDigits('');
      }
    } catch (err: any) {
      setError(err.message || "Authentication error.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: otpError } = await dbService.supabase.auth.verifyOtp({
        email: email,
        token: otpDigits,
        type: 'signup'
      });

      if (otpError) throw otpError;

      if (data.user) {
        try {
          const now = new Date();
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const memberSince = `${months[now.getMonth()]} ${now.getFullYear()}`;

          await dbService.saveItem('profiles', {
            id: data.user.id,
            username: username,
            email: email,
            member_since: memberSince,
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
          });
        } catch (syncErr) {
          console.warn("Profile sync failed:", syncErr);
        }

        await dbService.supabase.auth.signOut();
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSuccess = () => {
    setStep('input');
    setActiveTab('signin');
    setOtpDigits('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const resendOtp = async () => {
    // Strictly prevent execution if timer is still counting down or already loading
    if (timer > 0 || loading) return;

    setLoading(true);
    try {
      const { error } = await dbService.supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      setTimer(120);
      setOtpDigits('');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1A1A1A] rounded-[40px] border border-white/10 p-10 shadow-2xl animate-in slide-in-up">
        {step !== 'success' && (
          <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#404040] hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}

        {step === 'success' ? (
          <div className="flex flex-col items-center py-4 animate-in fade-in">
            <div className="w-20 h-20 bg-[#7B2CBF]/10 rounded-full flex items-center justify-center text-[#7B2CBF] mb-6 border border-[#7B2CBF]/20 shadow-2xl shadow-[#7B2CBF]/10">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Signup Success</h2>
            <p className="text-[#606060] text-xs font-bold text-center mb-8 leading-relaxed px-4">
              Your account has been verified. You can now log in with your credentials.
            </p>
            <button 
              onClick={handleFinishSuccess}
              className="w-full py-4 bg-[#7B2CBF] text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg active:scale-95 transition-all"
            >
              OK
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 mb-4 flex items-center justify-center animate-in slide-in-up">
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
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                {step === 'otp' ? 'Verification' : (activeTab === 'signin' ? 'Login' : 'Join')}
              </h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold text-center">
                {error}
              </div>
            )}

            {step === 'input' ? (
              <>
                <div className="flex bg-[#0A0A0A] rounded-xl p-1 mb-6 border border-white/5">
                  <button onClick={() => setActiveTab('signin')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'signin' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#404040]'}`}>Login</button>
                  <button onClick={() => setActiveTab('signup')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'signup' ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#404040]'}`}>Join</button>
                </div>

                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleAction(); }}>
                  {activeTab === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-[#606060] tracking-widest ml-1">Username</label>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-3 px-5 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-[#606060] tracking-widest ml-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-3 px-5 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-[#606060] tracking-widest ml-1">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-3 px-5 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" required />
                  </div>
                  {activeTab === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-[#606060] tracking-widest ml-1">Confirm</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-3 px-5 text-xs font-bold text-white outline-none focus:border-[#7B2CBF] transition-all" />
                    </div>
                  )}
                  <button type="submit" disabled={loading} className="w-full py-4 bg-[#7B2CBF] text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg disabled:opacity-50 mt-2 active:scale-95 transition-all">
                     {loading ? 'Processing...' : (activeTab === 'signin' ? 'Login' : 'Join')}
                  </button>
                </form>
              </>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">Verification Code Sent</p>
                  <p className="text-white text-xs font-bold">{email}</p>
                </div>
                
                <div className="relative">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpDigits} 
                      onChange={(e) => setOtpDigits(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-6 px-6 text-center text-4xl font-black tracking-[0.4em] focus:border-[#7B2CBF] outline-none text-white shadow-inner" 
                      placeholder="000000"
                    />
                </div>

                <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#404040]">
                      {timer > 0 ? `Resend in ${formatTime(timer)}` : 'Ready to resend'}
                    </p>
                    <button 
                      type="button"
                      onClick={resendOtp} 
                      disabled={timer > 0 || loading} 
                      className={`text-[10px] font-black uppercase tracking-widest transition-all underline decoration-dotted underline-offset-4 ${timer > 0 || loading ? 'text-gray-600 opacity-50 cursor-not-allowed pointer-events-none' : 'text-[#7B2CBF] hover:text-white cursor-pointer'}`}
                    >
                      Resend
                    </button>
                </div>

                <button 
                  onClick={handleVerifyOtp}
                  disabled={loading || otpDigits.length < 6}
                  className="w-full py-4 bg-[#7B2CBF] text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {loading ? 'Verifying...' : 'Verify & Complete'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
