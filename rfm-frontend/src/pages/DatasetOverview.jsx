import { useMemo } from 'react';
import Card from '../components/Card';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import useClustering from '../hooks/useClustering';
import useDataset from '../hooks/useDataset';
import { useAnalytics } from '../contexts/AnalyticsContext';

const CLUSTER_COLORS = {
  'VIP Customers': '#6366f1',
  'Loyal Customers': '#a855f7',
  'New Customers': '#06b6d4',
  'Lost Customers': '#f59e0b',
};

function segmentColor(name) {
  return CLUSTER_COLORS[name] || '#94a3b8';
}

export default function DatasetOverview() {
  const { uploadedData } = useAnalytics();
  const { stats, loading: dsLoading, error: dsError, hasData: dsHasData } = useDataset();
  const { clustering, loading: clLoading, error: clError, hasData: clHasData } = useClustering();

  const loading = dsLoading || clLoading;
  const error = dsError || clError;

  // Build sample records from clustering labels
  const sampleRecords = useMemo(() => {
    if (!clustering?.labels) return [];
    return clustering.labels.slice(0, 15).map((l) => ({
      id: l.customer_id,
      recency: l.recency,
      frequency: l.frequency,
      monetary: l.monetary,
      cluster: l.cluster_name,
    }));
  }, [clustering]);

  // Build feature list from dataset info
  const features = useMemo(() => {
    const info = uploadedData?.dataset_info;
    const columns = info?.columns_detected || ['customer_id', 'purchase_date', 'product_name', 'total_amount', 'quantity', 'country'];
    const rfmFeatures = ['recency', 'frequency', 'monetary'];

    return [
      ...columns.map((col) => ({
        name: col.replace(/_/g, ' '),
        type: ['customer_id', 'product_name', 'country'].includes(col) ? 'Categorical' : 'Numeric',
        missing: 0,
        isRfm: rfmFeatures.includes(col),
        isSegment: false,
      })),
      ...rfmFeatures.map((f) => ({
        name: f.charAt(0).toUpperCase() + f.slice(1),
        type: 'Numeric',
        missing: 0,
        isRfm: true,
        isSegment: false,
      })),
      {
        name: 'Customer Segment',
        type: 'Categorical',
        missing: 0,
        isRfm: false,
        isSegment: true,
      },
    ];
  }, [uploadedData]);

  const totalRecords = stats?.totalTransactions ?? '-';
  const totalColumns = features.length;
  const timePeriod = uploadedData?.dataset_info?.date_range ?? 'Jan 2024 - Dec 2025';

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className="text-red-400 p-6">Error loading data: {error}</div>;
  if (!dsHasData) return <EmptyState description="No dataset loaded yet. Upload a dataset to view transaction data overview, feature list, and sample records." linkText="Upload Dataset" />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Dataset Overview</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Customer transaction data used for hierarchical clustering analysis
        </p>
        {uploadedData && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            Your uploaded dataset
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: typeof totalRecords === 'number' ? totalRecords.toLocaleString() : totalRecords, label: 'Total Records', color: '#1e293b' },
          { value: '3', label: 'RFM Features', sub: 'Core clustering dimensions', color: '#6366f1' },
          { value: String(totalColumns), label: 'Dataset Columns', sub: 'Total attributes', color: '#1e293b' },
          { value: timePeriod, label: 'Time Period', color: '#1e293b' },
        ].map((k) => (
          <Card key={k.label} className="flex flex-col justify-center px-5 py-5">
            <p
              className="text-4xl font-extrabold tracking-tight leading-none"
              style={{ color: k.color }}
            >
              {k.value}
            </p>
            <p className="text-xs font-semibold text-slate-600 mt-2 uppercase tracking-wide">
              {k.label}
            </p>
            {k.sub && <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>}
          </Card>
        ))}
      </div>

      {/* Data source */}
      <Card className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-slate-700">Customer Transaction Dataset</p>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {uploadedData ? 'User-uploaded CSV' : 'Synthetic e-commerce customer data'}
          </span>
        </div>
      </Card>

      {/* Feature List */}
      <Card title="Feature List">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Feature Name</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Missing Values</th>
                <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr
                  key={i}
                  className={`border-b border-slate-100 transition-colors ${
                    f.isRfm
                      ? 'bg-indigo-50/50 hover:bg-indigo-50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className={`px-5 py-2.5 ${f.isRfm ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                    {f.name}
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                        f.type === 'Numeric'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {f.type}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      No Missing
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    {f.isRfm ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Used for Clustering
                      </span>
                    ) : f.isSegment ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                        Clustering Output
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Metadata</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Technical note */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3">
        <p className="text-xs text-indigo-900 leading-relaxed">
          <span className="font-bold">Note:</span> This dataset is transformed into RFM features and normalised
          before applying Hierarchical Clustering with Ward linkage and Euclidean distance.
        </p>
      </div>

      {/* Sample Records */}
      <Card title="Sample Records" description="First 15 customer records with cluster assignments">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr className="border-b border-slate-200">
                {[
                  { key: 'id', label: 'Customer ID', align: 'text-left' },
                  { key: 'recency', label: 'Recency (days)', align: 'text-right' },
                  { key: 'frequency', label: 'Frequency', align: 'text-right' },
                  { key: 'monetary', label: 'Monetary', align: 'text-right' },
                  { key: 'cluster', label: 'Segment', align: 'text-left' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`${col.align} px-5 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRecords.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-1.5 font-mono text-xs font-medium text-slate-700">{row.id}</td>
                  <td className="px-5 py-1.5 text-slate-600 text-right tabular-nums">{row.recency}</td>
                  <td className="px-5 py-1.5 text-slate-600 text-right tabular-nums">{row.frequency}</td>
                  <td className="px-5 py-1.5 text-slate-600 text-right tabular-nums font-medium">
                    ${row.monetary.toLocaleString()}
                  </td>
                  <td className="px-5 py-1.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-semibold border"
                      style={{
                        color: segmentColor(row.cluster),
                        backgroundColor: segmentColor(row.cluster) + '14',
                        borderColor: segmentColor(row.cluster) + '30',
                      }}
                    >
                      {row.cluster}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
