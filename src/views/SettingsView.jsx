import { useState } from 'react';
import { Shield, Bell, ChevronLeft, Lock, Sliders, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useData } from '../contexts/useData';
import { uploadMedia } from '../services/storage';

export const SettingsView = () => {
  const { user } = useAuth();
  const { updateProfile } = useData();
  const [bio, setBio] = useState(user?.bio || '');
  const [vibe, setVibe] = useState(user?.vibe || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const avatar = avatarFile ? await uploadMedia(avatarFile) : user?.avatar;
      await updateProfile({ bio, vibe, avatar });
      setAvatarFile(null);
      setSaved(true);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>

        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile</h2>
          <label className="flex items-center gap-3 text-sm text-slate-500 cursor-pointer">
            {user?.avatar && <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />}
            <ImageIcon size={18} />
            <span>{avatarFile?.name || 'Change avatar'}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
          </label>
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Bio" className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-2xl text-sm resize-none" rows="3" />
          <input value={vibe} onChange={(event) => setVibe(event.target.value)} placeholder="Current vibe" className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-2xl text-sm" />
          {saveError && <p role="alert" className="text-sm text-rose-500">{saveError}</p>}
          {saved && <p role="status" className="text-sm text-emerald-600">Profile updated.</p>}
          <button disabled={isSaving} className="bg-violet-600 disabled:opacity-60 text-white px-4 py-2.5 rounded-2xl text-xs font-bold">
            {isSaving ? 'Saving...' : 'Save profile'}
          </button>
        </form>

        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { title: 'Account Privacy', desc: 'Control who sees your vibe and online status', icon: Shield },
            { title: 'Notifications', desc: 'Message alerts and story updates', icon: Bell },
            { title: 'Security & Password', desc: 'Two-factor auth and active sessions', icon: Lock },
            { title: 'Storage & Data', desc: 'Network usage and media auto-download', icon: Sliders }
          ].map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-2xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</h3>
                    <p className="text-xs text-slate-400">{s.desc}</p>
                  </div>
                </div>
                <ChevronLeft size={18} className="rotate-180 text-slate-400" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
