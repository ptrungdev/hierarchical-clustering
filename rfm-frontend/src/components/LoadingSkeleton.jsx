export default function LoadingSkeleton() {
  const pulse = 'animate-pulse rounded-lg bg-slate-200';

  return (
    <div className="space-y-6">
      <div>
        <div className={`${pulse} h-6 w-56`} />
        <div className={`${pulse} h-4 w-80 mt-2`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className={`${pulse} w-9 h-9 rounded-lg`} />
              <div className={`${pulse} w-12 h-4 rounded`} />
            </div>
            <div className={`${pulse} h-6 w-16`} />
            <div className={`${pulse} h-3 w-20`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-slate-200 p-5">
          <div className={`${pulse} h-5 w-40 mb-2`} />
          <div className={`${pulse} h-4 w-56 mb-4`} />
          <div className={`${pulse} h-72 w-full`} />
        </div>
        <div className="bg-card rounded-xl border border-slate-200 p-5">
          <div className={`${pulse} h-5 w-36 mb-2`} />
          <div className={`${pulse} h-4 w-44 mb-4`} />
          <div className={`${pulse} h-72 w-full`} />
        </div>
      </div>
    </div>
  );
}
