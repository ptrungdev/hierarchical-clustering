/**
 * A radial gauge that visualizes the silhouette score (0-1).
 * Green zone: ≥0.5, yellow: 0.3-0.5, red: <0.3.
 */
export default function SilhouetteGauge({ score, size = 140 }) {
  if (score === undefined || score === null) return null;

  const clamped = Math.max(0, Math.min(1, score));
  const pct = clamped * 100;

  let zoneColor = '#ef4444';
  if (clamped >= 0.5) zoneColor = '#10b981';
  else if (clamped >= 0.3) zoneColor = '#f59e0b';

  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r * 2;
  const arcLen = circumference * clamped;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20}>
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke={zoneColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700"
        />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-800" fontSize={24} fontWeight="bold">
          {score.toFixed(2)}
        </text>
      </svg>
      <span
        className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full"
        style={{ color: zoneColor, backgroundColor: zoneColor + '18' }}
      >
        {clamped >= 0.5 ? 'Good' : clamped >= 0.3 ? 'Fair' : 'Weak'} Separation
      </span>
    </div>
  );
}
