import { useState, useRef } from 'react';
import { uploadDataset } from '../utils/api';
import { useAnalytics } from '../contexts/AnalyticsContext';
import Card from '../components/Card';
import ErrorBanner from '../components/ErrorBanner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  User,
  Calendar,
  ShoppingCart,
  Tag,
  Globe,
  Layers,
  BarChart3,
  Users,
} from 'lucide-react';

const REQUIRED_COLUMNS = [
  { column: 'CustomerID', description: 'Unique customer identifier', icon: User },
  { column: 'InvoiceDate', description: 'Transaction date and time', icon: Calendar },
  { column: 'Quantity', description: 'Product quantity purchased', icon: ShoppingCart },
  { column: 'UnitPrice', description: 'Product unit price', icon: Tag },
];

const OPTIONAL_COLUMNS = [
  { column: 'InvoiceNo', description: 'Invoice / order number', icon: FileSpreadsheet },
  { column: 'StockCode', description: 'Product stock code / SKU', icon: Tag },
  { column: 'Description', description: 'Product description', icon: Layers },
  { column: 'Country', description: 'Customer country', icon: Globe },
];

const PROCESS_STEPS = [
  'Validating dataset format...',
  'Normalizing column names...',
  'Removing canceled orders...',
  'Filtering invalid transactions...',
  'Computing RFM metrics...',
  'Scaling features...',
  'Running hierarchical clustering...',
  'Generating dendrogram...',
  'Building dashboard results...',
];

const SAMPLE_CSV = `InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice,CustomerID,Country
536365,85123A,White hanging heart candle holder,6,12/1/2010 8:26,17767.50,United Kingdom
536365,71053,White metal lantern,6,12/1/2010 8:26,17767.50,United Kingdom
536365,84406B,Creche set 12pc wooden painted,8,12/1/2010 8:26,17767.50,United Kingdom
536367,22157,Wine racks gift box,6,12/1/2010 8:34,17767.51,United Kingdom
536367,21706,Wicker basket with story book,6,12/1/2010 8:34,17767.51,United Kingdom
536368,84952,Set 7 batik scented candles red,6,12/1/2010 8:30,12983,France
536368,84952C,Set 7 batik s cented candles star,6,12/1/2010 8:30,12983,France
536369,22713,Knife magnet,2,12/1/2010 8:36,13748,Germany
536370,84878,Giant chess rubber wipe clean,12,12/1/2010 8:34,17767.52,Spain`;

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function DatasetUpload() {
  const { setUploadedData } = useAnalytics();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Unsupported file format. Please upload a CSV or Excel file.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setUploadProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFileSelect(f);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, PROCESS_STEPS.length - 1);
      setProgressText(PROCESS_STEPS[stepIndex]);
    }, 800);

    try {
      const data = await uploadDataset(file, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      clearInterval(stepInterval);
      setProgressText('');
      setUploadedData(data);
      setResult(data);
    } catch (err) {
      clearInterval(stepInterval);
      setProgressText('');
      const msg = err.response?.data?.detail || err.message || 'Upload failed.';
      if (typeof msg === 'string') setError(msg);
      else setError(JSON.stringify(msg));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dataset Upload</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload e-commerce transaction dataset (Online Retail format supported) for RFM analysis and hierarchical clustering.
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Upload Dataset File</h3>
              <p className="text-xs text-slate-500">
                CSV or Excel format supported. Select or drop a file containing transaction data.
              </p>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
            <FileSpreadsheet className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-primary' : 'text-slate-300'}`} />
            {file ? (
              <div className="space-y-1">
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                <p className="text-xs text-primary font-medium">Click or drop to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Click to choose file or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">CSV or Excel format supported</p>
              </div>
            )}
          </div>

          {/* Sample CSV Download */}
          <div className="flex justify-end">
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </button>
          </div>
        </div>
      </Card>

      {/* Required + Supported Columns */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Dataset Format</h3>
            <p className="text-xs text-slate-500">
              The system automatically preprocesses Online Retail transaction datasets. Column matching is case-insensitive and tolerates spaces or underscores.
            </p>
          </div>
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Required Columns</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REQUIRED_COLUMNS.map((item) => (
            <div key={item.column} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <item.icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 font-mono">{item.column}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Supported Additional Columns</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPTIONAL_COLUMNS.map((item) => (
              <div key={item.column} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-100/50">
                <item.icon className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 font-mono">{item.column}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Process Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleProcess}
          disabled={!file || processing}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
            !file || processing
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark'
          }`}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Process Dataset'
          )}
        </button>

        {processing && (
          <div className="flex-1">
            <p className="text-sm text-slate-600">{progressText}</p>
            {uploadProgress > 0 && (
              <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Processing Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Dataset Processed Successfully</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                RFM segmentation and hierarchical clustering completed. Navigate to the dashboard pages to explore results.
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{result.dataset_info?.total_customers?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Customers</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{result.dataset_info?.total_transactions?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Transactions</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{result.clustering?.clusters?.length ?? 4}</p>
                  <p className="text-xs text-slate-500">Clusters Found</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  (result.clustering?.silhouette ?? 0) >= 0.5 ? 'bg-emerald-50' :
                  (result.clustering?.silhouette ?? 0) >= 0.3 ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  <span className={`text-lg font-bold ${
                    (result.clustering?.silhouette ?? 0) >= 0.5 ? 'text-emerald-600' :
                    (result.clustering?.silhouette ?? 0) >= 0.3 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {(result.clustering?.silhouette ?? 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {(result.clustering?.silhouette ?? 0).toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-500">Silhouette Score</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Cluster Breakdown */}
          {result.clustering?.clusters && (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Cluster Segments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {result.clustering.clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <p className="text-sm font-semibold text-slate-900">{cluster.name}</p>
                    </div>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Customers</span>
                        <span className="font-semibold">{cluster.size.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Share</span>
                        <span className="font-semibold">{cluster.percentage}%</span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between">
                        <span>Avg Recency</span>
                        <span className="font-mono">{cluster.avg_recency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Frequency</span>
                        <span className="font-mono">{cluster.avg_frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Monetary</span>
                        <span className="font-mono">${cluster.avg_monetary}</span>
                      </div>
                      <div className="h-px bg-slate-100" />
                      <div className="flex justify-between">
                        <span>Total Revenue</span>
                        <span className="font-semibold text-slate-900">${cluster.total_revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Date Range</h4>
              <p className="text-sm font-medium text-slate-900">{result.dataset_info?.date_range}</p>
            </Card>
            <Card>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Data Cleaning</h4>
              <p className="text-sm text-slate-900">
                <span className="font-semibold">{result.dataset_info?.rows_removed?.toLocaleString()}</span>
                {' '}total rows removed during preprocessing
              </p>
            </Card>
          </div>

          {/* Preprocessing Summary */}
          {result.preprocessing_summary && (
            <Card>
              <h3 className="font-semibold text-slate-900 mb-4">Preprocessing Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 rounded-xl bg-slate-50">
                  <p className="text-xl font-bold text-slate-800">{result.preprocessing_summary.original_rows?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Original Rows</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-xl font-bold text-amber-600">{result.preprocessing_summary.removed_canceled?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Canceled Orders</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xl font-bold text-red-600">{result.preprocessing_summary.removed_invalid?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Invalid Rows</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-orange-50 border border-orange-100">
                  <p className="text-xl font-bold text-orange-600">{result.preprocessing_summary.removed_missing_customer?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Missing CustomerID</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-xl font-bold text-indigo-600">{result.preprocessing_summary.final_transactions?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Final Transactions</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xl font-bold text-emerald-600">{result.preprocessing_summary.total_customers?.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Total Customers</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
