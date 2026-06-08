import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileBarChart, Check, AlertCircle, Database, Upload } from 'lucide-react';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { exportCsv, exportExcel, exportPdf } from '../utils/api';
import { useAnalytics } from '../contexts/AnalyticsContext';

function downloadFile(result) {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportButton({ icon: Icon, title, description, format, onClick, loading, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`text-left rounded-xl border border-slate-200 p-5 hover:border-primary/50 hover:shadow-md transition-all group ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
          {format}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-slate-700 mb-1">{title}</h4>
      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{description}</p>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] ${loading ? 'text-amber-500' : 'text-slate-400'}`}>
          {loading ? 'Generating...' : 'Ready'}
        </span>
        <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${loading ? 'text-amber-500' : 'text-primary group-hover:text-primary-dark'}`}>
          {loading ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 animate-spin" />
              Generating
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Download
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusBanner({ status }) {
  if (!status) return null;
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${status === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
      {status === 'success' ? (
        <Check className="w-5 h-5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
      )}
      <p className={`text-sm ${status === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
        {status === 'success' ? 'File generated successfully. Download starting...' : 'Failed to generate file. Please try again.'}
      </p>
    </div>
  );
}

export default function ExportReport() {
  const { uploadedData } = useAnalytics();
  const [loading, setLoading] = useState({ csv: false, excel: false, pdf: false });
  const [status, setStatus] = useState(null);

  const dataSource = uploadedData ? 'User-uploaded dataset' : 'Default synthetic dataset';

  const handleExport = async (key, fn) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setStatus(null);
    try {
      const result = await fn();
      downloadFile(result);
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (!uploadedData) {
    return <EmptyState description="Nothing to export yet. Upload a dataset to generate RFM analysis and clustering reports." linkText="Upload Dataset" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Export Report</h2>
        <p className="text-sm text-slate-400 mt-0.5">Download analysis results and reports</p>
        <div className="flex items-center gap-2 mt-2">
          {uploadedData ? <Upload className="w-3.5 h-3.5 text-emerald-500" /> : <Database className="w-3.5 h-3.5 text-slate-400" />}
          <span className={`text-xs font-medium ${uploadedData ? 'text-emerald-600' : 'text-slate-500'}`}>
            Exporting from: {dataSource}
          </span>
        </div>
      </div>

      <StatusBanner status={status} />

      <Card title="Export Options" description="Select a report type to download">
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportButton
              icon={FileText}
              title="Dashboard Summary"
              description="Complete RFM analysis report with key metrics, cluster summary table, and business insights."
              format="PDF"
              color="#6366f1"
              loading={loading.pdf}
              onClick={() => handleExport('pdf', exportPdf)}
            />
            <ExportButton
              icon={FileSpreadsheet}
              title="Clustering Analysis"
              description="Multi-sheet Excel workbook with RFM scores, cluster summary, and top customers per segment."
              format="XLSX"
              color="#8b5cf6"
              loading={loading.excel}
              onClick={() => handleExport('excel', exportExcel)}
            />
            <ExportButton
              icon={FileBarChart}
              title="RFM Score Table"
              description="Full customer dataset with recency, frequency, monetary values, and cluster assignments."
              format="CSV"
              color="#06b6d4"
              loading={loading.csv}
              onClick={() => handleExport('csv', exportCsv)}
            />
          </div>
        </div>
      </Card>

      <Card title="File Contents">
        <div className="px-5 pb-5">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-red-500" />
                <h4 className="text-sm font-semibold text-slate-700">Dashboard Summary (PDF)</h4>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 ml-8 list-disc">
                <li>Key metrics: total customers, transactions, revenue, average order value</li>
                <li>Cluster summary table with segment size, RFM averages, and revenue</li>
                <li>Silhouette score and model quality assessment</li>
                <li>Business insights and actionable recommendations</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-700">Clustering Analysis (Excel)</h4>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 ml-8 list-disc">
                <li>Sheet 1: Full RFM scores with cluster assignments for all customers</li>
                <li>Sheet 2: Cluster summary statistics and comparison metrics</li>
                <li>Sheets 3-6: Top 20 customers per segment by monetary value</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileBarChart className="w-5 h-5 text-sky-500" />
                <h4 className="text-sm font-semibold text-slate-700">RFM Score Table (CSV)</h4>
              </div>
              <ul className="text-xs text-slate-500 space-y-1.5 ml-8 list-disc">
                <li>All 5,000 customers with customer_id, recency, frequency, monetary</li>
                <li>Cluster name assigned per customer</li>
                <li>Sorted by monetary value (descending)</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
