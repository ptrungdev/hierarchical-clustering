import { CheckCircle2, Clock } from 'lucide-react';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import { useAnalytics } from '../contexts/AnalyticsContext';

const defaultSteps = [
  { step: 1, title: 'Load Raw Transactions', description: 'Read transaction records from the UCI Online Retail dataset', details: 'Parsed CSV file with customer transaction records', status: 'completed' },
  { step: 2, title: 'Normalize Column Names', description: 'Map column names to internal canonical format', details: 'Handles CamelCase, snake_case, spaces, and mixed case (e.g. CustomerID, customer_id)', status: 'completed' },
  { step: 3, title: 'Parse Datetime Fields', description: 'Convert InvoiceDate strings to datetime objects', details: 'Supports US date format (M/D/YYYY H:MM) and ISO datetime', status: 'completed' },
  { step: 4, title: 'Remove Canceled Orders', description: 'Filter out return/cancel invoices where InvoiceNo starts with "C"', details: 'Online Retail dataset uses "C" prefix for cancel invoices (e.g. C536379)', status: 'completed' },
  { step: 5, title: 'Remove Invalid Rows', description: 'Drop rows with missing CustomerID, non-positive Quantity, or non-positive UnitPrice', details: 'Ensures data quality before RFM computation', status: 'completed' },
  { step: 6, title: 'Remove Duplicate Transactions', description: 'Detect and remove exact duplicate transaction rows', details: 'Compares customer_id, invoice_no, date, quantity, and price', status: 'completed' },
  { step: 7, title: 'Compute Transaction Amounts', description: 'Calculate TotalPrice = Quantity x UnitPrice for each transaction', details: 'Used as the monetary base for RFM aggregation', status: 'completed' },
  { step: 8, title: 'Compute RFM Metrics', description: 'Calculate per-customer recency, frequency (unique invoices), monetary', details: 'Reference date = latest InvoiceDate + 1 day', status: 'completed' },
];

export default function DataPreprocessing() {
  const { uploadedData } = useAnalytics();

  const info = uploadedData?.dataset_info;
  const prep = uploadedData?.preprocessing_summary;
  const totalTransactions = info?.total_transactions ?? '4,800';
  const totalCustomers = info?.total_customers ?? '5,000';
  const rowsRemoved = info?.rows_removed ?? '0';
  const columnsDetected = info?.columns_detected ?? ['customer_id', 'purchase_date', 'product_name', 'total_amount', 'country'];

  const steps = defaultSteps.map((s) => ({
    ...s,
    status: 'completed',
  }));

  // Enrich step details with real numbers when available
  const enrichedSteps = steps.map((s) => {
    if (!uploadedData) return s;
    switch (s.step) {
      case 1:
        return { ...s, details: `Loaded ${prep?.original_rows?.toLocaleString() ?? 'N/A'} raw transaction rows` };
      case 2:
        return { ...s, details: `Detected and mapped ${columnsDetected.length} columns: ${columnsDetected.join(', ')}` };
      case 4:
        return { ...s, details: `Removed ${prep?.removed_canceled?.toLocaleString() ?? 0} canceled/return invoice rows` };
      case 5:
        return { ...s, details: `Removed ${prep?.removed_invalid?.toLocaleString() ?? 0} invalid rows (bad dates: ${prep?.removed_bad_date ?? 0}, bad quantity: ${prep?.removed_bad_quantity ?? 0}, bad price: ${prep?.removed_bad_price ?? 0})` };
      case 6:
        return { ...s, details: `Removed ${prep?.removed_duplicates?.toLocaleString() ?? 0} duplicate transaction rows` };
      case 8:
        return { ...s, details: `Computed RFM for ${prep?.total_customers?.toLocaleString() ?? totalCustomers} customers from ${prep?.final_transactions?.toLocaleString() ?? totalTransactions} clean transactions` };
      default:
        return s;
    }
  });

  if (!uploadedData) {
    return <EmptyState description="No preprocessing data yet. Upload a dataset to see the data cleaning and transformation pipeline steps." linkText="Upload Dataset" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Data Preprocessing</h2>
        <p className="text-sm text-slate-400 mt-0.5">Step-by-step transformation pipeline for UCI Online Retail dataset</p>
        {uploadedData && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            Your uploaded dataset
          </span>
        )}
      </div>

      <div className="space-y-4">
        {enrichedSteps.map((step) => (
          <Card key={`${step.step}-${step.title}`} className="px-6 py-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                step.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-amber-100 text-amber-600'
              }`}>
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-slate-800">Step {step.step}: {step.title}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    step.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                <div className="mt-3 rounded-lg bg-slate-50 px-4 py-2.5">
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Details:</span> {step.details}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preprocessing Summary */}
      <Card title="Preprocessing Summary">
        <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 rounded-xl bg-slate-50">
            <p className="text-xl font-bold text-slate-800">{prep?.original_rows?.toLocaleString() ?? totalTransactions}</p>
            <p className="text-[11px] text-slate-400 mt-1">Original Rows</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xl font-bold text-amber-600">{prep?.removed_canceled?.toLocaleString() ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Canceled Orders</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-red-50 border border-red-100">
            <p className="text-xl font-bold text-red-600">{prep?.removed_invalid?.toLocaleString() ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Invalid Rows</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-xl font-bold text-indigo-600">{prep?.final_transactions?.toLocaleString() ?? totalTransactions}</p>
            <p className="text-[11px] text-slate-400 mt-1">Final Transactions</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xl font-bold text-emerald-600">{prep?.total_customers?.toLocaleString() ?? totalCustomers}</p>
            <p className="text-[11px] text-slate-400 mt-1">Total Customers</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-violet-50 border border-violet-100">
            <p className="text-xl font-bold text-violet-600">{columnsDetected.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Columns Detected</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
