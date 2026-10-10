import { useState } from 'react';
import { Image as ImageIcon, MessageCircle, Heart, Plus, X } from 'lucide-react';
import { useData } from '../contexts/useData';
import { Avatar } from '../components/ui/Avatar';
import { FetchState } from '../components/ui/FetchState';
import { uploadMedia } from '../services/storage';

export const MomentsView = () => {
  const { moments, circles, loading, errors, refreshMoments, createMoment, showToast } = useData();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleCreate(event) {
    event.preventDefault();
    if (!selectedImage) {
      setSubmitError('Choose an image for your moment.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const image = await uploadMedia(selectedImage);
      await createMoment({
        image,
        title: form.get('title'),
        location: form.get('location'),
        circleId: form.get('circleId') || undefined,
      });
      setShowCreate(false);
      setSelectedImage(null);
      showToast('Moment shared!');
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 dark:bg-slate-900 overflow-y-auto pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shared Moments</h1>
            <p className="text-xs text-slate-500">Temporary timeline memories shared inside your circles.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-violet-600 text-white px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
            <Plus size={15} /> Create Moment
          </button>
        </div>

        <FetchState loading={loading.moments} error={errors.moments} onRetry={refreshMoments}>
          <div className="space-y-6">
            {moments.map((moment) => (
              <div key={moment.id} className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar src={moment.author?.avatar || moment.authorAvatar} size="sm" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">{moment.author?.name || moment.authorName || 'Vibely user'}</h3>
                      <p className="text-[10px] text-slate-400">{moment.location} • {moment.time || moment.createdAt}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 rounded-full">{moment.circle?.name || moment.circle || 'Shared moment'}</span>
                </div>
                <img src={moment.image || moment.imageUrl} className="w-full h-80 object-cover" alt="Moment" />
                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{moment.title}</h4>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 pt-2">
                    <button className="flex items-center space-x-1 hover:text-rose-500"><Heart size={16} /> <span>{moment.likes ?? 0}</span></button>
                    <button className="flex items-center space-x-1 hover:text-violet-500"><MessageCircle size={16} /> <span>{moment.comments ?? 0}</span></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FetchState>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-950 max-w-md w-full p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Moment</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
              <ImageIcon size={18} /><span>{selectedImage?.name || 'Choose an image'}</span>
              <input type="file" accept="image/*" required className="sr-only" onChange={(event) => setSelectedImage(event.target.files?.[0] || null)} />
            </label>
            <input name="title" required placeholder="Moment title" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-sm text-slate-900 dark:text-white" />
            <input name="location" placeholder="Location" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-sm text-slate-900 dark:text-white" />
            <select name="circleId" defaultValue="" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-sm text-slate-900 dark:text-white">
              <option value="">Choose a circle (optional)</option>
              {circles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
            </select>
            {submitError && <p role="alert" className="text-sm text-rose-500">{submitError}</p>}
            <button disabled={isSubmitting} className="w-full bg-violet-600 disabled:opacity-60 text-white p-3 rounded-2xl text-sm font-bold">
              {isSubmitting ? 'Uploading...' : 'Share Moment'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
