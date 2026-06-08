import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  Award,
  RefreshCw,
  BarChart3,
  Network,
} from 'lucide-react';
import Card from '../components/Card';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import useDataset from '../hooks/useDataset';
import useClustering from '../hooks/useClustering';
import useRfm from '../hooks/useRfm';
import { useAnalytics } from '../contexts/AnalyticsContext';

const CLUSTER_COLORS = {
  'VIP Customers': '#6366f1',
  'Loyal Customers': '#a855f7',
  'New Customers': '#06b6d4',
  'Lost Customers': '#f59e0b',
};

const customTooltipStyle = {
  backgroundColor: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#fff',
  fontSize: '12px',
};

const countryColors = ['#6366f1', '#a855f7', '#06b6d4', '#f59e0b', '#10b981', '#ec4899'];

function StatCards({ stats, onRefresh }) {
  const cards = [
    { label: 'Customers', value: stats.totalCustomers.toLocaleString(), icon: Users, color: '#6366f1' },
    { label: 'Revenue', value: `$${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: '#10b981' },
    { label: 'Transactions', value: stats.totalTransactions.toLocaleString(), icon: ShoppingCart, color: '#f59e0b' },
    { label: 'Avg Order', value: `$${stats.avgOrderValue}`, icon: TrendingUp, color: '#06b6d4' },
    { label: 'Countries', value: new Set(stats.topCountries.map((c) => c.country)).size, icon: Activity, color: '#a855f7' },
    { label: 'Products', value: new Set(stats.revenueDistribution.map((r) => r.name)).size, icon: Award, color: '#ec4899' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-400">Live data from API</p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((stat) => (
          <Card key={stat.label} className="px-4 py-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: stat.color + '14' }}>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-extrabold text-slate-800 leading-none">{stat.value}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wide font-medium">{stat.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RevenueChart({ data }) {
  return (
    <Card title="Revenue Trend" description="Monthly revenue and transaction count">
      <div className="px-5 pb-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="orders" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 justify-center mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#6366f1' }} />
            <span className="text-[10px] text-slate-500">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ borderTop: '1px dashed #a855f7' }} />
            <span className="text-[10px] text-slate-500">Transactions</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RevenueDonut({ data }) {
  return (
    <Card title="Revenue Distribution" description="By product category">
      <div className="px-5 pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={customTooltipStyle} formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-slate-500 truncate">{item.name}</span>
              <span className="text-[10px] font-semibold text-slate-700 ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TopCountriesChart({ data }) {
  return (
    <Card title="Top Countries" description="Revenue by country">
      <div className="px-5 pb-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.slice(0, 6)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="country" tick={{ fontSize: 10 }} stroke="#94a3b8" width={55} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
              {data.slice(0, 6).map((_, i) => (
                <Cell key={i} fill={countryColors[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RFMHistogram({ data, label, color }) {
  return (
    <Card title={`${label} Distribution`}>
      <div className="px-5 pb-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
            <XAxis dataKey="score" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DendrogramPreview() {
  const { imageSrc, loading } = useClustering();

  return (
    <Link to="/dendrogram" className="block group">
      <Card title="Dendrogram" description="Hierarchical clustering tree">
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
              <div className="text-center">
                <Network className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading preview...</p>
              </div>
            </div>
          ) : imageSrc ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <img
                src={imageSrc}
                alt="Dendrogram Preview"
                className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-300"
                style={{ maxHeight: 220, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
              <p className="text-xs text-slate-400">Unable to load preview</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Ward &middot; Euclidean &middot; 4 Clusters
            </div>
            <span className="text-xs font-medium text-indigo-600 group-hover:underline">
              View full &rarr;
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Scatter3DPreview() {
  const { clustering, loading } = useClustering();
  const labels = clustering?.labels ?? [];

  /* Build a compact dot-grid preview from clustering data */
  const preview = (() => {
    const groups = {};
    labels.forEach((l) => {
      const name = l.cluster_name;
      if (!groups[name]) groups[name] = [];
      groups[name].push(l);
    });

    const maxR = Math.max(...labels.map((l) => l.recency), 1);
    const maxF = Math.max(...labels.map((l) => l.frequency), 1);
    const maxM = Math.max(...labels.map((l) => l.monetary), 1);

    /* Pick up to 80 representative samples for visual */
    const samples = [];
    const step = Math.max(1, Math.floor(labels.length / 80));
    for (let i = 0; i < labels.length; i += step) {
      const l = labels[i];
      samples.push({
        x: l.recency / maxR,
        y: l.frequency / maxF,
        z: l.monetary / maxM,
        color: CLUSTER_COLORS[l.cluster_name] || '#94a3b8',
      });
    }
    return samples;
  })();

  return (
    <Link to="/visualization" className="block group">
      <Card title="3D Cluster Visualization" description="RFM scatter plot">
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading preview...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50/30">
                <svg viewBox="0 0 300 200" className="w-full" style={{ maxHeight: 200 }}>
                  {/* Simple 3D-like scatter */}
                  <g transform="translate(30, 20)">
                    {/* Axes */}
                    <line x1="0" y1="150" x2="0" y2="10" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="0" y1="150" x2="240" y2="150" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="0" y1="150" x2="-10" y2="160" stroke="#cbd5e1" strokeWidth="1" />
                    {preview.map((d, i) => (
                      <circle
                        key={i}
                        cx={d.x * 230}
                        cy={140 - d.y * 120 - d.z * 30}
                        r={2}
                        fill={d.color}
                        opacity={0.65}
                      />
                    ))}
                  </g>
                </svg>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2.5">
                  {Object.keys(CLUSTER_COLORS).map((name) => (
                    <div key={name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[name] }} />
                      <span className="text-[9px] text-slate-400">{name.replace(' Customers', '')}</span>
                    </div>
                  ))}
                </div>
                <span className="text-xs font-medium text-indigo-600 group-hover:underline">
                  View full &rarr;
                </span>
              </div>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
}

function ClusterSummary() {
  const { clustering, loading } = useClustering();
  const clusters = clustering?.clusters ?? [];

  if (loading || clusters.length === 0) {
    return (
      <Card title="Cluster Summary" description="Customer segments identified by hierarchical clustering">
        <div className="px-5 pb-5 flex items-center justify-center" style={{ minHeight: 180 }}>
          <p className="text-xs text-slate-400">Loading clusters...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Cluster Summary" description="Customer segments identified by hierarchical clustering">
      <div className="px-5 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cluster.color }} />
                <span className="text-sm font-bold text-slate-800">{cluster.name}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Customers</span>
                  <span className="font-semibold text-slate-700">{cluster.size} <span className="text-slate-400">({cluster.percentage}%)</span></span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['Recency', 'Frequency', 'Monetary'].map((metric) => {
                    const key = metric === 'Recency' ? 'avg_recency' : metric === 'Frequency' ? 'avg_frequency' : 'avg_monetary';
                    return (
                      <div key={metric} className="text-center rounded-md bg-slate-50 px-1.5 py-1">
                        <p className="text-[9px] text-slate-400 uppercase font-semibold">{metric[0]}</p>
                        <p className="text-xs font-bold text-slate-700">
                          {metric === 'Monetary' ? '$' : ''}
                          {typeof cluster[key] === 'number' ? cluster[key].toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs pt-1.5 border-t border-slate-100">
                  <span className="text-slate-400 font-medium">Revenue</span>
                  <span className="font-bold text-slate-800">${(cluster.total_revenue / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SilhouetteGauge() {
  const { clustering, loading } = useClustering();
  const score = clustering?.silhouette ?? 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);
  const quality = score >= 0.5 ? 'Good' : score >= 0.3 ? 'Moderate' : 'Low';
  const qualityColor = score >= 0.5 ? 'text-emerald-500' : score >= 0.3 ? 'text-amber-500' : 'text-red-500';

  if (loading) {
    return (
      <Card title="Silhouette Score" description="Cluster quality metric">
        <div className="flex items-center justify-center pb-5">
          <p className="text-xs text-slate-400">Loading...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Silhouette Score" description="Cluster quality metric">
      <div className="flex items-center justify-center pb-5">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={radius} fill="none" stroke="url(#gaugeGradient)" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{score.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400">Score</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Range</p>
              <p className="text-xs font-semibold text-slate-600">-1 to 1</p>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Quality</p>
              <p className={`text-xs font-semibold ${qualityColor}`}>{quality}</p>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Clusters</p>
              <p className="text-xs font-semibold text-slate-600">{clustering?.clusters?.length ?? 4}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function binsToScores(bins) {
  return bins.map((b) => ({
    score: b.label,
    count: b.count,
  }));
}

export default function Dashboard() {
  const { stats, loading, error, hasData } = useDataset();
  const { rfm } = useRfm();
  const { clustering } = useClustering();
  const { uploadedData } = useAnalytics();

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;
  if (!hasData) return <EmptyState />;

  const recencyBins = rfm?.recency_histogram ? binsToScores(rfm.recency_histogram) : [];
  const frequencyBins = rfm?.frequency_histogram ? binsToScores(rfm.frequency_histogram) : [];
  const monetaryBins = rfm?.monetary_histogram ? binsToScores(rfm.monetary_histogram) : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dashboard Overview</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          RFM Customer Segmentation Analysis &middot; {stats.totalCustomers.toLocaleString()} customers &middot; {stats.totalTransactions.toLocaleString()} transactions
        </p>
        {uploadedData && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            Uploaded dataset active
          </span>
        )}
      </div>

      <StatCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart data={stats.months} />
        </div>
        <RevenueDonut data={stats.revenueDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopCountriesChart data={stats.topCountries} />
        <RFMHistogram data={recencyBins} label="Recency" color="#6366f1" />
        <RFMHistogram data={frequencyBins} label="Frequency" color="#a855f7" />
        <RFMHistogram data={monetaryBins} label="Monetary" color="#06b6d4" />
      </div>

      <ClusterSummary />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DendrogramPreview />
        <Scatter3DPreview />
        <SilhouetteGauge />
      </div>
    </div>
  );
}
