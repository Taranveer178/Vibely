

export const StoryRing = ({ src, isViewed, size = 'lg', className = '' }) => {
  const sizes = { md: 'w-14 h-14', lg: 'w-16 h-16' };
  const ringColor = isViewed ? 'border-slate-300 dark:border-slate-700' : 'border-violet-500 ring-2 ring-violet-400/40';

  return (
    <div className={`p-0.5 rounded-full border-2 ${ringColor} ${className} transition-transform hover:scale-105`}>
      <img src={src} className={`${sizes[size]} rounded-full object-cover border-2 border-white dark:border-slate-950`} alt="Story" />
    </div>
  );
};
