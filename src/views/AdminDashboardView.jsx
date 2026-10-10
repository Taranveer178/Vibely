import { useEffect, useState } from 'react';
import { Users, Activity, Sparkles, ShieldAlert } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../services/api';
import { FetchState } from '../components/ui/FetchState';

function fetchAdminData() {
  return Promise.all([
    api.get('/api/admin/analytics'),
    api.get('/api/admin/users'),
  ]);
}

export const AdminDashboardView = () => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingUserId, setPendingUserId] = useState(null);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [analyticsResult, usersResult] = await fetchAdminData();
      setAnalytics(analyticsResult || {});
      const userList = Array.isArray(usersResult) ? usersResult : usersResult?.items || [];
      setUsers(userList);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const suspendUser = async (userId) => {
    setPendingUserId(userId);
    setError('');
    try {
      const result = await api.post(`/api/admin/users/${encodeURIComponent(userId)}/suspend`, {});
      const updatedUser = result?.user ?? result;
      setUsers((current) => current.map((item) => (
        item.id === userId ? { ...item, ...updatedUser, status: updatedUser.status || 'suspended' } : item
      )));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingUserId(null);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminData()
      .then(([analyticsResult, usersResult]) => {
        if (!active) return;
        setAnalytics(analyticsResult || {});
        setUsers(Array.isArray(usersResult) ? usersResult : usersResult?.items || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vibely Admin Console</h1>
          <p className="text-xs text-slate-500">Real-time system health and user moderation.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Accounts', value: analytics.totalAccounts ?? '—', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
            { label: 'Active Vibes Today', value: analytics.activeToday ?? '—', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950' },
            { label: 'Transcripts Processed', value: analytics.transcriptsProcessed ?? '—', icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950' },
            { label: 'Moderation Reports', value: analytics.pendingReports ?? '—', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* User Management Table */}
        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active System Accounts</h2>
          </div>
          <FetchState loading={loading} error={error} onRetry={loadAdminData}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-4 flex items-center space-x-3">
                      <Avatar src={u.avatar} size="sm" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.username}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${u.role === 'admin' ? 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${u.status === 'suspended' ? 'text-rose-500' : 'text-emerald-500'}`}>{u.status || 'Active'}</span>
                    </td>
                    <td className="p-4 text-right">
                      {u.status !== 'suspended' && (
                        <button disabled={pendingUserId === u.id} onClick={() => suspendUser(u.id)} className="text-rose-500 hover:underline disabled:opacity-60 font-semibold">
                          {pendingUserId === u.id ? 'Suspending...' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </FetchState>
        </div>

      </div>
    </div>
  );
};
