import { NavLink } from 'react-router-dom';
import useClustering from '../hooks/useClustering';
import {
  LayoutDashboard,
  Table,
  Upload,
  Wand2,
  BarChart3,
  GitBranch,
  Layers,
  Box,
  Lightbulb,
  FileText,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dataset', label: 'Dataset Overview', icon: Table },
  { path: '/upload', label: 'Dataset Upload', icon: Upload },
  { path: '/preprocessing', label: 'Data Preprocessing', icon: Wand2 },
  { path: '/rfm-analysis', label: 'RFM Analysis', icon: BarChart3 },
  { path: '/dendrogram', label: 'Dendrogram', icon: GitBranch },
  { path: '/clustering', label: 'Clustering Result', icon: Layers },
  { path: '/visualization', label: '3D Visualization', icon: Box },
  { path: '/insights', label: 'Business Insights', icon: Lightbulb },
  { path: '/export', label: 'Export Report', icon: FileText },
];

function SilhouetteBar() {
  const { clustering } = useClustering();
  const score = clustering?.silhouette ?? null;

  if (score === null) {
    return (
      <div className="p-4 border-t border-slate-700/50">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-4">
          <p className="text-xs text-white font-semibold mb-1">Model Performance</p>
          <p className="text-[11px] text-slate-400 mb-3">Loading...</p>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-slate-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, score * 100));

  let zoneColor = '#ef4444';
  if (score >= 0.5) zoneColor = '#10b981';
  else if (score >= 0.3) zoneColor = '#f59e0b';

  return (
    <div className="p-4 border-t border-slate-700/50">
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-4">
        <p className="text-xs text-white font-semibold mb-1">Model Performance</p>
        <p className="text-[11px] text-slate-400 mb-3">
          Silhouette Score: <span style={{ color: zoneColor, fontWeight: 'bold' }}>{score.toFixed(3)}</span>
        </p>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: zoneColor }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar text-slate-300 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">RFM Analytics</h1>
              <p className="text-[10px] text-slate-500">Customer Segmentation</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">
            Navigation
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-white'
                    : 'hover:bg-sidebar-hover text-slate-400 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <SilhouetteBar />
      </aside>
    </>
  );
}
