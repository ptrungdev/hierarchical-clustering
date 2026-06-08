export default function Card({ children, className = '', title, description }) {
  return (
    <div className={`bg-card rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {(title || description) && (
        <div className="px-5 pt-5 pb-3">
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
