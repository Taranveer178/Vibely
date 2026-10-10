import { useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import { useData } from '../contexts/useData';
import { FetchState } from '../components/ui/FetchState';

export const CirclesView = () => {
  const { circles, createCircle, loading, errors, refreshCircles } = useData();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await createCircle({ name: name.trim(), description });
      setName('');
      setDescription('');
      setShowModal(false);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Private Circles</h1>
            <p className="text-xs text-slate-500">Selective social spaces with custom privacy boundaries.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-2xl flex items-center space-x-2 text-xs font-bold transition-all shadow-md shadow-violet-500/20">
            <Plus size={16} />
            <span>New Circle</span>
          </button>
        </div>

        <FetchState loading={loading.circles} error={errors.circles} onRetry={refreshCircles}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {circles.map(circle => {
            const Icon = Lock;
            return (
              <div key={circle.id} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-2xl ${circle.color} text-white flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{circle.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{circle.description}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-400">{circle.members} Members</span>
                  <button className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">Open Circle</button>
                </div>
              </div>
            );
          })}
        </div>
        </FetchState>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 max-w-md w-full p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Private Circle</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input 
                type="text" 
                placeholder="Circle Name (e.g., Founders Club)" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-2xl text-xs border border-transparent focus:border-violet-500 focus:outline-none"
              />
              <textarea 
                placeholder="Description & purpose..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-3 rounded-2xl text-xs border border-transparent focus:border-violet-500 focus:outline-none h-20 resize-none"
              />
              {submitError && <p role="alert" className="text-xs text-rose-500">{submitError}</p>}
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-violet-600 disabled:opacity-60 text-white px-4 py-2 rounded-2xl text-xs font-bold">{isSubmitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
