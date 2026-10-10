import { useState } from 'react';
import { useData } from '../contexts/useData';
import { useAuth } from '../contexts/useAuth';
import { Avatar } from '../components/ui/Avatar';
import { FetchState } from '../components/ui/FetchState';
import { sendConnectionRequest as createConnectionRequest } from '../services/firebaseData';

export const DiscoverView = () => {
  const { user } = useAuth();
  const { users, showToast, loading, errors, refreshUsers } = useData();
  const [requestError, setRequestError] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);

  const sendConnectionRequest = async (targetUser) => {
    setPendingUserId(targetUser.id);
    setRequestError('');
    try {
      await createConnectionRequest(user.id, targetUser.id);
      showToast(`Connection request sent to ${targetUser.name}!`);
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Discover & Mood Match</h1>
          <p className="text-xs text-slate-500">Connect with people sharing your vibe right now.</p>
        </div>

        {requestError && <p role="alert" className="text-sm text-rose-500">{requestError}</p>}
        <FetchState loading={loading.users} error={errors.users} onRetry={refreshUsers}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <Avatar src={u.avatar} size="md" isOnline={u.isOnline} vibe={u.vibe} />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{u.name}</h3>
                  <p className="text-xs text-violet-600 dark:text-violet-400">{u.vibe}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{u.bio}</p>
                </div>
              </div>
              <button 
                onClick={() => sendConnectionRequest(u)}
                disabled={pendingUserId === u.id}
                className="bg-slate-900 dark:bg-slate-800 text-white px-3 py-2 rounded-2xl text-xs font-semibold hover:bg-violet-600 disabled:opacity-60 transition-colors"
              >
                {pendingUserId === u.id ? 'Sending...' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
        </FetchState>
      </div>
    </div>
  );
};
