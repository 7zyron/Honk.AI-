import React, { useState } from 'react';
import { X, User, Mail, Shield, Check, LogOut, Cake, Sparkles, Calendar } from 'lucide-react';
import { UserProfile, DailyUsage, UserBirthday } from '../types';
import { HonkLogo } from './HonkLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onSignOut?: () => void;
  usage: DailyUsage | null;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
];

const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
];

function getDaysInMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSignOut,
  usage,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'signin' | 'new'>('profile');
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || PRESET_AVATARS[0]);
  const [isSaved, setIsSaved] = useState(false);

  // Birthday state (Month 1-12, Day 1-31)
  const [birthMonth, setBirthMonth] = useState<number | ''>(currentUser.birthday?.month || '');
  const [birthDay, setBirthDay] = useState<number | ''>(currentUser.birthday?.day || '');

  // Google Sign In prompt state
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);

  // New user registration fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    let birthdayObj: UserBirthday | null = null;
    if (birthMonth && birthDay) {
      birthdayObj = {
        month: Number(birthMonth),
        day: Number(birthDay),
      };
    }

    onUpdateUser({
      ...currentUser,
      name: name.trim() || 'Honk User',
      email: email.trim(),
      avatar,
      birthday: birthdayObj,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRemoveBirthday = () => {
    setBirthMonth('');
    setBirthDay('');
    onUpdateUser({
      ...currentUser,
      birthday: null,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleGoogleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    const googleUser: UserProfile = {
      id: 'usr_g_' + Math.random().toString(36).substring(2, 9),
      name: googleName.trim() || googleEmail.split('@')[0],
      email: googleEmail.trim(),
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      isGuest: false,
      isAuthenticated: true,
      createdAt: Date.now(),
      birthday: birthMonth && birthDay ? { month: Number(birthMonth), day: Number(birthDay) } : null,
    };

    onUpdateUser(googleUser);
    setName(googleUser.name);
    setEmail(googleUser.email);
    setAvatar(googleUser.avatar);
    setShowGooglePrompt(false);
    setActiveTab('profile');
    onClose();
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    const newUser: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: newName.trim() || newEmail.split('@')[0],
      email: newEmail.trim(),
      avatar: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      isGuest: false,
      isAuthenticated: true,
      createdAt: Date.now(),
      birthday: null,
    };
    onUpdateUser(newUser);
    setName(newUser.name);
    setEmail(newUser.email);
    setAvatar(newUser.avatar);
    setActiveTab('profile');
    onClose();
  };

  const handleGuestMode = () => {
    const guestUser: UserProfile = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Guest User',
      email: '',
      avatar: '',
      isGuest: true,
      isAuthenticated: false,
      createdAt: Date.now(),
      birthday: null,
    };
    onUpdateUser(guestUser);
    setName(guestUser.name);
    setEmail('');
    setAvatar('');
    setBirthMonth('');
    setBirthDay('');
    setActiveTab('profile');
    onClose();
  };

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      handleGuestMode();
    }
  };

  const maxDays = birthMonth ? getDaysInMonth(Number(birthMonth)) : 31;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-zinc-900 p-6 shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <HonkLogo size="sm" glow alt="Honk Account" />
            <div>
              <h3 className="font-bold text-base text-zinc-50">
                {currentUser.isAuthenticated ? 'Account & Profile' : 'Honk Account'}
              </h3>
              <p className="text-xs text-zinc-400">
                {currentUser.isAuthenticated
                  ? 'Manage your identity and preferences'
                  : 'Sign in to sync settings and history'}
              </p>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="mt-4 flex rounded-xl bg-zinc-800/80 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 rounded-lg py-1.5 font-medium transition ${
              activeTab === 'profile'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Profile & Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            className={`flex-1 rounded-lg py-1.5 font-medium transition ${
              activeTab === 'signin'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In with Google
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex-1 rounded-lg py-1.5 font-medium transition ${
              activeTab === 'new'
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            <div className="flex items-center gap-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name || 'User'}
                  className="h-14 w-14 rounded-2xl border-2 border-amber-500/50 object-cover shadow-md"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 border-2 border-zinc-700 text-zinc-400 font-bold text-lg">
                  {name ? name.charAt(0).toUpperCase() : 'G'}
                </div>
              )}
              <div className="flex-1">
                <span className="text-xs font-semibold text-zinc-400">Choose Avatar</span>
                <div className="mt-1.5 flex gap-1.5">
                  {PRESET_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`h-7 w-7 rounded-lg overflow-hidden border-2 transition ${
                        avatar === av ? 'border-amber-400 scale-110' : 'border-zinc-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={av} alt="option" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300">Display Name</label>
              <div className="mt-1 flex items-center rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100">
                <User className="mr-2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent outline-none"
                  placeholder="Your Name (e.g. Alex)"
                />
              </div>
            </div>

            {currentUser.isAuthenticated && (
              <div>
                <label className="block text-xs font-medium text-zinc-300">Email Address</label>
                <div className="mt-1 flex items-center rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100">
                  <Mail className="mr-2 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent outline-none"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            )}

            {/* Optional Birthday Section */}
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Cake className="h-4 w-4 text-amber-400" />
                  Birthday (Optional)
                </label>
                {(birthMonth || birthDay) && (
                  <button
                    type="button"
                    onClick={handleRemoveBirthday}
                    className="text-[11px] text-zinc-400 hover:text-red-400 transition"
                  >
                    Remove Birthday
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Honk will wish you a happy birthday when the date matches! Only month & day are saved locally. No year is asked.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">
                    Month
                  </label>
                  <select
                    value={birthMonth}
                    onChange={(e) => {
                      const m = e.target.value ? Number(e.target.value) : '';
                      setBirthMonth(m);
                      if (m && birthDay && Number(birthDay) > getDaysInMonth(m)) {
                        setBirthDay(getDaysInMonth(m));
                      }
                    }}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400"
                  >
                    <option value="">Select Month</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">
                    Day
                  </label>
                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400"
                  >
                    <option value="">Select Day</option>
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quota breakdown box */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  Account Status
                </span>
                <span className="font-semibold text-amber-300">
                  {currentUser.isAuthenticated ? 'Authenticated Account' : 'Guest Sandbox'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Daily AI Quota:</span>
                <span className="text-zinc-200">
                  {usage ? `${usage.used} / ${usage.limit} messages used` : '100 msgs / day'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 active:scale-98"
              >
                {isSaved ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>

              {currentUser.isAuthenticated && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition"
                  title="Sign out of this device"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Sign In with Google Tab */}
        {activeTab === 'signin' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Sign in with your Google Account to synchronize your chats, settings, and personal AI memory securely across your devices.
            </p>

            {!showGooglePrompt ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowGooglePrompt(true)}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white py-2.5 px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 shadow-md active:scale-98"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <span className="relative bg-zinc-900 px-3 text-xs text-zinc-500 uppercase">or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGuestMode}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2.5 px-4 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700 hover:text-zinc-100"
                >
                  <User className="h-4 w-4" />
                  <span>Continue as Guest</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleGoogleSignIn} className="space-y-3 bg-zinc-800/60 p-4 rounded-xl border border-zinc-700">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Enter your Google Account details</span>
                </div>
                <div>
                  <label className="block text-xs text-zinc-300">Your Google Name</label>
                  <input
                    type="text"
                    required
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-300">Your Gmail Address</label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition"
                  >
                    Confirm Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGooglePrompt(false)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* New Account Tab */}
        {activeTab === 'new' && (
          <form onSubmit={handleCreateAccount} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Alex River"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300">Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. alex@example.com"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 shadow-md active:scale-98"
            >
              Create Account & Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
