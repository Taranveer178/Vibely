

export const Avatar = ({ src, size = 'md', isOnline, vibe, className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <img src={src} alt="Avatar" className={`${sizes[size]} rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm`} />
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
      )}
      {vibe && (
        <span className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-full shadow-md border border-slate-100 dark:border-slate-700 whitespace-nowrap">
          {vibe.split(' ')[0]}
        </span>
      )}
    </div>
  );
};
