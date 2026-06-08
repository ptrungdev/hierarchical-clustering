import { Link } from 'react-router-dom';
import Card from './Card';

export default function EmptyState({ title = '', description = '', linkText = 'Go to Upload Dataset', to = '/upload' }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center py-12 px-8 border-dashed border-2">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-700">
              {title || 'No dataset loaded yet'}
            </h3>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              {description || 'Upload a dataset to begin RFM analysis and hierarchical clustering.'}
            </p>
          </div>
          <Link
            to={to}
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {linkText}
          </Link>
        </div>
      </Card>
    </div>
  );
}
