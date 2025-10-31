const Skeleton = ({ className = '', variant = 'default', ...props }) => {
  const baseClasses = 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded';
  const variantClasses = {
    default: '',
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    circle: 'rounded-full',
    card: 'h-32 w-full',
    button: 'h-10 w-24',
  };
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant] || ''} ${className}`}
      {...props}
    />
  );
};

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg ring-1 ring-slate-900/5 p-6">
      <div className="space-y-4">
        <Skeleton variant="title" />
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-5/6" />
        <div className="flex gap-2 mt-4">
          <Skeleton variant="button" />
          <Skeleton variant="button" />
        </div>
      </div>
    </div>
  );
};

const SkeletonTable = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
};

const SkeletonForm = () => {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <div className="flex gap-3 justify-end">
        <Skeleton variant="button" className="w-32" />
        <Skeleton variant="button" className="w-32" />
      </div>
    </div>
  );
};

Skeleton.Card = SkeletonCard;
Skeleton.Table = SkeletonTable;
Skeleton.Form = SkeletonForm;

export default Skeleton;

