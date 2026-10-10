import { useContext, useEffect, useState } from 'react';
import { Heart, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { useData } from '../contexts/useData';
import { RouterContext } from '../contexts/RouterContext';
import { Avatar } from '../components/ui/Avatar';
import { FetchState } from '../components/ui/FetchState';
import { uploadMedia } from '../services/storage';

export const StoriesView = () => {
  const { user } = useAuth();
  const { stories, users, loading, errors, refreshStories, createStory, markStoryViewed } = useData();
  const { navigate, routeParams } = useContext(RouterContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCreate, setShowCreate] = useState(Boolean(routeParams.create));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const requestedIndex = stories.findIndex((story) => story.id === routeParams.storyId);
  const displayedIndex = requestedIndex >= 0 ? requestedIndex : currentIndex;
  const activeStory = stories[displayedIndex] || stories[0];
  const storyAuthor = activeStory?.author
    || activeStory?.user
    || users.find((item) => item.id === activeStory?.userId)
    || (activeStory?.userId === user?.id ? user : null)
    || user;

  useEffect(() => {
    if (!activeStory?.id || activeStory.isViewed) return;
    markStoryViewed(activeStory.id).catch((error) => setSubmitError(error.message));
  }, [activeStory?.id, activeStory?.isViewed, markStoryViewed]);

  async function handleCreate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const imageFile = selectedImage;
    if (!imageFile) {
      setSubmitError('Choose an image for your story.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const image = await uploadMedia(imageFile);
      const created = await createStory({
        image,
        caption: form.get('caption'),
        vibe: form.get('vibe'),
      });
      setShowCreate(false);
      setSelectedImage(null);
      const createdIndex = stories.findIndex((story) => story.id === created.id);
      setCurrentIndex(createdIndex >= 0 ? createdIndex : 0);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 h-screen bg-black flex items-center justify-center relative p-4">
      <button onClick={() => navigate('/')} className="absolute top-5 right-5 text-white bg-white/20 p-3 rounded-full backdrop-blur-md z-30">
        <X size={20} />
      </button>

      <FetchState loading={loading.stories} error={errors.stories} onRetry={refreshStories}>
        {activeStory ? (
          <div className="w-full max-w-sm h-[85vh] bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col justify-between p-4">
            <img src={activeStory.image || activeStory.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Story" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

            <div className="relative z-10 space-y-3">
              <div className="flex space-x-1">
                {stories.map((story, index) => (
                  <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className={`h-full bg-white transition-all duration-300 ${index <= displayedIndex ? 'w-full' : 'w-0'}`}></div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <Avatar src={storyAuthor?.avatar} size="sm" />
                  <div>
                    <p className="text-xs font-bold">{storyAuthor?.name || 'Vibely user'}</p>
                    <p className="text-[10px] opacity-75">{activeStory.timestamp}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-violet-600 px-2.5 py-1 rounded-full">{activeStory.vibe}</span>
              </div>
            </div>

            <div className="relative z-10 space-y-4">
              <p className="text-white text-base font-semibold drop-shadow-md">{activeStory.caption}</p>
              <div className="flex items-center space-x-2">
                <input type="text" placeholder="Reply to story..." className="flex-1 bg-white/20 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-2xl border border-white/20 placeholder-white/70 focus:outline-none" />
                <button className="bg-violet-600 text-white p-2.5 rounded-2xl"><Heart size={18} /></button>
              </div>
            </div>

            <div className="absolute inset-0 flex">
              <div className="w-1/2 h-full cursor-pointer" onClick={() => setCurrentIndex(Math.max(0, displayedIndex - 1))}></div>
              <div className="w-1/2 h-full cursor-pointer" onClick={() => setCurrentIndex(Math.min(stories.length - 1, displayedIndex + 1))}></div>
            </div>
          </div>
        ) : (
          <div className="text-white text-sm">No stories yet. Share the first one!</div>
        )}
      </FetchState>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-950 max-w-md w-full p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create a Story</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
              <ImageIcon size={18} />
              <span>{selectedImage?.name || 'Choose an image'}</span>
              <input type="file" accept="image/*" required className="sr-only" onChange={(event) => setSelectedImage(event.target.files?.[0] || null)} />
            </label>
            <input name="caption" placeholder="Add a caption..." className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-sm text-slate-900 dark:text-white" />
            <input name="vibe" placeholder="Your vibe" className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-sm text-slate-900 dark:text-white" />
            {submitError && <p role="alert" className="text-sm text-rose-500">{submitError}</p>}
            <button disabled={isSubmitting} className="w-full bg-violet-600 disabled:opacity-60 text-white p-3 rounded-2xl text-sm font-bold">
              {isSubmitting ? 'Uploading...' : 'Share Story'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
