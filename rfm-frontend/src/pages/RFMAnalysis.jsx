import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { BarChart3, Users, TrendingUp, DollarSign, ArrowLeftRight } from 'lucide-react';
import Card from '../components/Card';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import useRfm from '../hooks/useRfm';

const customTooltipStyle = {
  backgroundColor: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#fff',
  fontSize: '12px',
};

const histogramColors = {
  recency: '#6366f1',
  frequency: '#8b5cf6',
  monetary: '#06b6d4',
};

function StatCards({ summary }) {
  const cards = [
    {
      label: 'Total Customers',
      value: new Intl.NumberFormat().format(summary.total),
      icon: Users,
      color: 'from-primary to-primary-dark',
    },
    {
      label: 'Avg Recency',
      value: `${Math.round(summary.recency.mean)} days`,
      icon: TrendingUp,
      color: 'from-primary to-purple-600',
    },
    {
      label: 'Avg Frequency',
      value: summary.frequency.mean.toFixed(1),
      icon: BarChart3,
      color: 'from-accent to-purple-600',
    },
    {
      label: 'Avg Monetary',
      value: `$${summary.monetary.mean}`,
      icon: DollarSign,
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      label: 'Median Revenue',
      value: `$${summary.monetary.median}`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: 'Max Revenue',
      value: `$${(summary.monetary.max / 1000).toFixed(1)}K`,
      icon: ArrowLeftRight,
      color: 'from-amber-500 to-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((stat) => (
        <Card key={stat.label} className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-800">{stat.value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{stat.label}</p>
        </Card>
      ))}
    </div>
  );
}

function HistogramChart({ data, label, color }) {
  const chartData = data.map((d) => ({
    name: d.label,
    count: d.count,
  }));

  return (
    <Card title={`${label} Distribution`} description="Binned customer counts across ranges">
      <div className="px-5 pb-5">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-45} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function SummaryTable({ summary }) {
  const stats = [
    { key: 'mean', label: 'Mean' },
    { key: 'median', label: 'Median' },
    { key: 'std', label: 'Std Dev' },
    { key: 'min', label: 'Min' },
    { key: 'q25', label: '25th %ile' },
    { key: 'q75', label: '75th %ile' },
    { key: 'max', label: 'Max' },
  ];

  return (
    <Card title="Summary Statistics" description="Descriptive statistics for each RFM dimension">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Statistic</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Recency (days)</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Frequency (orders)</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">Monetary ($)</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.key} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2.5 font-medium text-slate-600">{s.label}</td>
                <td className="px-5 py-2.5 text-slate-700 text-right font-mono">{summary.recency[s.key]}</td>
                <td className="px-5 py-2.5 text-slate-700 text-right font-mono">{summary.frequency[s.key]}</td>
                <td className="px-5 py-2.5 text-slate-700 text-right font-mono">${summary.monetary[s.key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TopCustomersTable({ customers }) {
  return (
    <Card title="Top 20 Customers" description="Highest spenders ranked by total monetary value">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Rank', 'Customer ID', 'Recency', 'Frequency', 'Monetary'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.customer_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-2.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                    c.rank <= 3
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.rank}
                  </span>
                </td>
                <td className="px-5 py-2.5 font-medium text-slate-700">{c.customer_id}</td>
                <td className="px-5 py-2.5 text-slate-500 font-mono">{c.recency}d</td>
                <td className="px-5 py-2.5 text-slate-500 font-mono">{c.frequency}</td>
                <td className="px-5 py-2.5 font-semibold text-slate-800 font-mono">${c.monetary.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RfmDistributionOverview({ histograms }) {
  // Normalize histograms for a comparison chart
  const rHist = histograms.recency;
  const fHist = histograms.frequency;
  const mHist = histograms.monetary;

  const maxBin = Math.max(rHist.length, fHist.length, mHist.length);
  const comparison = Array.from({ length: maxBin }, (_, i) => ({
    name: i + 1,
    recency: rHist[i] ? rHist[i].count : 0,
    frequency: fHist[i] ? fHist[i].count : 0,
    monetary: mHist[i] ? mHist[i].count : 0,
  }));

  return (
    <Card title="Distribution Comparison" description="Side-by-side bin comparison (same number of bins)">
      <div className="px-5 pb-5">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={comparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="recency" fill="#6366f1" opacity={0.7} radius={[3, 3, 0, 0]} name="Recency" />
            <Bar dataKey="frequency" fill="#8b5cf6" opacity={0.7} radius={[3, 3, 0, 0]} name="Frequency" />
            <Bar dataKey="monetary" fill="#06b6d4" opacity={0.7} radius={[3, 3, 0, 0]} name="Monetary" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 justify-center mt-2">
          {[
            { color: '#6366f1', label: 'Recency' },
            { color: '#8b5cf6', label: 'Frequency' },
            { color: '#06b6d4', label: 'Monetary' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function RFMAnalysis() {
  const { rfm, loading, error, hasData, refresh } = useRfm();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={refresh} />;
  }

  if (!hasData) {
    return <EmptyState description="No RFM analysis available yet. Upload a dataset to compute Recency, Frequency, and Monetary metrics." linkText="Upload Dataset" />;
  }

  const summary = {
    total: rfm.total_customers,
    recency: rfm.summary.recency,
    frequency: rfm.summary.frequency,
    monetary: rfm.summary.monetary,
  };

  const histograms = {
    recency: rfm.recency_histogram,
    frequency: rfm.frequency_histogram,
    monetary: rfm.monetary_histogram,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">RFM Analysis</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {rfm.total_customers.toLocaleString()} customers &middot; Reference date: {rfm.reference_date}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-white"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary stat cards */}
      <StatCards summary={summary} />

      {/* Histograms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HistogramChart data={histograms.recency} label="Recency" color={histogramColors.recency} />
        <HistogramChart data={histograms.frequency} label="Frequency" color={histogramColors.frequency} />
        <HistogramChart data={histograms.monetary} label="Monetary" color={histogramColors.monetary} />
      </div>

      {/* Distribution comparison + summary table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RfmDistributionOverview histograms={histograms} />
        <SummaryTable summary={summary} />
      </div>

      {/* Top customers table */}
      <TopCustomersTable customers={rfm.top_customers} />
    </div>
  );
}
