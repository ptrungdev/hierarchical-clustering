import { useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '../components/Card';
import SilhouetteGauge from '../components/SilhouetteGauge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import useClustering from '../hooks/useClustering';

const descriptions = {
  'VIP Customers': 'Highest-value customers — recent buyers with top frequency and spend. Prioritize for loyalty rewards.',
  'Loyal Customers': 'Regular buyers with solid engagement. Nurture with exclusive offers to push toward VIP tier.',
  'New Customers': 'Recent acquirers with lower purchase history. Target with onboarding sequences and first-repeat incentives.',
  'Lost Customers': 'Long inactive with low frequency and spend. Re-engage with win-back campaigns before full churn.',
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#fff',
  fontSize: '12px',
};

function getSilhouetteInfo(score) {
  if (score >= 0.7) return { label: 'Strong', color: '#10b981', desc: 'Clusters are well-separated with clear boundaries. Customer segments are distinct and reliable.' };
  if (score >= 0.5) return { label: 'Good', color: '#10b981', desc: 'Clusters show solid separation. Segments are meaningful and suitable for targeted strategies.' };
  if (score >= 0.3) return { label: 'Fair', color: '#f59e0b', desc: 'Clusters are somewhat distinct but overlap in places. Consider reviewing segment boundaries.' };
  return { label: 'Weak', color: '#ef4444', desc: 'Clusters overlap significantly. Results may not support reliable segmentation — consider adjusting features or cluster count.' };
}

export default function ClusteringResult() {
  const { clustering, loading, error, hasData } = useClustering();

  // All hooks before any conditional return (Rules of Hooks)
  const clusters = clustering?.clusters ?? [];
  const silhouette = clustering?.silhouette ?? 0;
  const totalRevenue = useMemo(() => clusters.reduce((s, c) => s + c.total_revenue, 0), [clusters]);
  const silInfo = useMemo(() => getSilhouetteInfo(silhouette), [silhouette]);
  const radarData = useMemo(() => {
    const rMax = Math.max(...clusters.map((c) => c.avg_recency), 1);
    const fMax = Math.max(...clusters.map((c) => c.avg_frequency), 1);
    const mMax = Math.max(...clusters.map((c) => c.avg_monetary), 1);
    return clusters.map((c) => ({
      ...c,
      rNorm: c.avg_recency / rMax,
      fNorm: c.avg_frequency / fMax,
      mNorm: c.avg_monetary / mMax,
    }));
  }, [clusters]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!hasData) return <EmptyState description="No clustering results yet. Upload a dataset to run hierarchical clustering and view customer segments." linkText="Upload Dataset" />;

  const totalCustomers = clusters.reduce((s, c) => s + c.size, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Clustering Results</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          {totalCustomers.toLocaleString()} customers segmented into {clusters.length} groups via Ward hierarchical clustering
        </p>
      </div>

      {/* Silhouette gauge */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 px-5 py-4">
          <SilhouetteGauge score={silhouette} size={140} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold text-slate-700">Model Quality</p>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: silInfo.color, backgroundColor: silInfo.color + '15' }}
              >
                {silInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Silhouette score measures how similar a customer is to its own cluster vs the nearest other cluster.
              Values range from <span className="font-medium text-slate-500">-1</span> (wrong) to <span className="font-medium text-slate-500">1</span> (perfect).
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed" style={{ color: silInfo.color }}>
              → {silInfo.desc}
            </p>
          </div>
        </div>
      </Card>

      {/* Cluster summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {clusters.map((cluster) => (
          <Card key={cluster.id} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: cluster.color }} />
            <div className="px-5 py-4">
              {/* Cluster name */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cluster.color }} />
                <h3 className="text-sm font-bold text-slate-800">{cluster.name}</h3>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                {descriptions[cluster.name]}
              </p>

              {/* Primary metrics: size + share */}
              <div className="flex items-end gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Customers</p>
                  <p className="text-2xl font-bold text-slate-800 tracking-tight">{cluster.size.toLocaleString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Share</p>
                  <p className="text-2xl font-bold tracking-tight" style={{ color: cluster.color }}>{cluster.percentage}%</p>
                </div>
              </div>

              {/* R/F/M metrics */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center rounded-lg bg-slate-50 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">R</p>
                  <p className="text-sm font-bold text-slate-700">{cluster.avg_recency}</p>
                </div>
                <div className="text-center rounded-lg bg-slate-50 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">F</p>
                  <p className="text-sm font-bold text-slate-700">{cluster.avg_frequency}</p>
                </div>
                <div className="text-center rounded-lg bg-slate-50 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">M</p>
                  <p className="text-sm font-bold text-slate-700">${Number(cluster.avg_monetary).toLocaleString()}</p>
                </div>
              </div>

              {/* Revenue */}
              <div className="rounded-lg p-3" style={{ backgroundColor: cluster.color + '12' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
                  <p className="text-lg font-bold text-slate-800 tracking-tight">
                    ${(cluster.total_revenue / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${(totalRevenue / 1000).toFixed(1)}K`, color: '#6366f1' },
          { label: 'Avg Revenue / Customer', value: `$${(totalRevenue / (totalCustomers || 1)).toFixed(0)}`, color: '#8b5cf6' },
          { label: 'Largest Segment', value: clusters.reduce((a, b) => a.size > b.size ? a : b)?.name, color: '#06b6d4' },
          { label: 'Highest Revenue Segment', value: clusters.reduce((a, b) => a.total_revenue > b.total_revenue ? a : b)?.name, color: '#f59e0b' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: kpi.color }} />
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-lg font-bold text-slate-800 tracking-tight">{kpi.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Radar comparison */}
      <Card title="Cluster Comparison" description="Normalized RFM metrics — each axis scaled to the segment with the highest value">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-5 pb-5">
          {radarData.map((cluster) => (
            <div key={cluster.id} className="flex flex-col items-center">
              <p className="text-sm font-bold mb-1" style={{ color: cluster.color }}>{cluster.name}</p>
              <p className="text-xs text-slate-400 mb-2">{cluster.size} customers · {cluster.percentage}%</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart
                  data={[
                    { metric: 'Recency', value: cluster.rNorm },
                    { metric: 'Frequency', value: cluster.fNorm },
                    { metric: 'Monetary', value: cluster.mNorm },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                >
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <PolarRadiusAxis domain={[0, 1]} tick={false} angle={30} />
                  <Radar
                    name={cluster.name}
                    dataKey="value"
                    stroke={cluster.color}
                    fill={cluster.color}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
