import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import useClustering from '../hooks/useClustering';
import EmptyState from '../components/EmptyState';

// Camera presets
const VIEWS = {
  default: { eye: { x: 1.4, y: 1.4, z: 1.0 }, label: 'Default' },
  top:     { eye: { x: 0.01, y: 0.01, z: 1.2 }, label: 'Top' },
  sideX:   { eye: { x: 1.6, y: 0.05, z: 0.05 }, label: 'Side (R-M)' },
  sideY:   { eye: { x: 0.05, y: 1.6, z: 0.05 }, label: 'Side (F-M)' },
  front:   { eye: { x: 0.01, y: 1.5, z: -0.05 }, label: 'Front (R-F)' },
};

const CAMERA_DURATION = 600;

// ── Business Intelligence Engine (rule-based) ───────────────────────────

const INSIGHT_TEMPLATES = {
  'VIP Customers': {
    desc: 'High-value loyal customers',
    strength: 'Strong purchase frequency and monetary value',
    recommendations: [
      'Launch VIP loyalty rewards program with exclusive benefits',
      'Offer early access to new products and limited editions',
      'Assign dedicated account managers for top spenders',
      'Create referral program leveraging their influence',
    ],
  },
  'Loyal Customers': {
    desc: 'Regular purchasers with steady engagement',
    strength: 'Consistent repeat purchase behavior',
    recommendations: [
      'Upsell premium product lines to increase order value',
      'Implement tiered rewards to encourage VIP promotion',
      'Send personalized product recommendations',
      'Offer bundled deals to increase basket size',
    ],
  },
  'New Customers': {
    desc: 'Recent acquirers with growth potential',
    strength: 'Fresh interest in the brand',
    recommendations: [
      'Send welcome series with onboarding product guides',
      'Offer first-repeat purchase discount within 30 days',
      'Collect preferences through post-purchase surveys',
      'Enroll in nurture campaign to build habits',
    ],
  },
  'Lost Customers': {
    desc: 'Inactive customers needing re-engagement',
    strength: 'Existing brand awareness and purchase history',
    recommendations: [
      'Deploy win-back email campaign with personalized offers',
      'Conduct exit surveys to understand churn reasons',
      'Offer time-limited comeback incentives',
      'Analyze last purchase date to segment urgency',
    ],
  },
};

function generateExecutiveSummary(clusters, totalCustomers) {
  const totalRevenue = clusters.reduce((s, c) => s + c.total_revenue, 0);
  const vip = clusters.find((c) => c.name === 'VIP Customers');
  const loyal = clusters.find((c) => c.name === 'Loyal Customers');
  const lost = clusters.find((c) => c.name === 'Lost Customers');
  const newC = clusters.find((c) => c.name === 'New Customers');

  const bullets = [];

  bullets.push({
    label: 'Overview',
    text: `${totalCustomers.toLocaleString()} customers segmented into 4 distinct groups with varying value profiles.`,
    color: '#818cf8',
  });

  if (vip) {
    const pct = ((vip.total_revenue / totalRevenue) * 100).toFixed(1);
    bullets.push({
      label: 'Highest Value',
      text: `VIP Customers represent ${vip.percentage}% of the base but contribute ${pct}% of total revenue.`,
      color: vip.color,
      highlight: true,
    });
  }

  if (lost) {
    bullets.push({
      label: 'Churn Risk',
      text: `Lost Customers account for ${lost.percentage}% with an average recency of ${lost.avg_recency} days — immediate re-engagement recommended.`,
      color: '#f87171',
    });
  }

  if (loyal && newC) {
    const pipeline = ((loyal.percentage + newC.percentage) * 100 / 100).toFixed(1);
    bullets.push({
      label: 'Growth Pipeline',
      text: `Loyal + New customers represent ${pipeline}% of the base — nurturing this group is critical for revenue growth.`,
      color: '#34d399',
    });
  }

  return bullets;
}

function detectRisks(clusters) {
  const risks = [];
  const totalRevenue = clusters.reduce((s, c) => s + c.total_revenue, 0);
  const lost = clusters.find((c) => c.name === 'Lost Customers');
  const vip = clusters.find((c) => c.name === 'VIP Customers');
  const loyal = clusters.find((c) => c.name === 'Loyal Customers');
  const newC = clusters.find((c) => c.name === 'New Customers');

  if (lost && lost.percentage > 30) {
    risks.push({
      level: 'critical',
      title: 'High Lost Customer Rate',
      message: `${lost.percentage}% of customers are classified as lost. This indicates significant churn risk and potential revenue leakage.`,
      icon: '!!',
    });
  } else if (lost && lost.percentage > 18) {
    risks.push({
      level: 'warning',
      title: 'Elevated Lost Customer Rate',
      message: `${lost.percentage}% of customers show declining engagement patterns. Monitor closely and consider proactive outreach.`,
      icon: '!',
    });
  }

  const dominant = clusters.find((c) => (c.total_revenue / totalRevenue) > 0.5);
  if (dominant) {
    const share = ((dominant.total_revenue / totalRevenue) * 100).toFixed(1);
    risks.push({
      level: dominant.total_revenue / totalRevenue > 0.6 ? 'critical' : 'warning',
      title: `${dominant.name} Revenue Dependency`,
      message: `${dominant.name} segment generates ${share}% of total revenue. Over-reliance on a single segment creates revenue volatility risk.`,
      icon: dominant.total_revenue / totalRevenue > 0.6 ? '!!' : '!',
    });
  }

  if (vip && vip.percentage < 8) {
    risks.push({
      level: 'warning',
      title: 'Small VIP Customer Base',
      message: `VIP Customers represent only ${vip.percentage}% of the base. Accelerate loyalty programs to promote high-potential customers to VIP tier.`,
      icon: '!',
    });
  }

  if (loyal && loyal.percentage < 15) {
    risks.push({
      level: 'warning',
      title: 'Small Loyal Customer Base',
      message: `Only ${loyal.percentage}% of customers are loyal. Invest in retention programs to grow this foundational segment.`,
      icon: '!',
    });
  }

  if (newC && newC.percentage < 10) {
    risks.push({
      level: 'warning',
      title: 'Low New Customer Acquisition',
      message: `New customers represent only ${newC.percentage}% of the base. Review acquisition channels and onboarding flow.`,
      icon: '!',
    });
  }

  return risks;
}

function buildComparisonRows(clusters) {
  const totalRevenue = clusters.reduce((s, c) => s + c.total_revenue, 0);
  return clusters.map((c) => ({
    ...c,
    revenueShare: ((c.total_revenue / totalRevenue) * 100).toFixed(1),
  }));
}

const buildTraces = (clusters, mergedCustomers, opacity) =>
  clusters.map((cluster) => {
    const points = mergedCustomers.get(cluster.name) || [];
    if (points.length === 0) return {};

    const x = [];
    const y = [];
    const z = [];
    const customdata = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      x.push(p.recency);
      y.push(p.frequency);
      z.push(p.monetary);
      customdata.push({
        cluster_name: cluster.name,
        recency: p.recency,
        frequency: p.frequency,
        monetary_str: `$${p.monetary.toFixed(2)}`,
        customer_id: p.customer_id,
      });
    }

    return {
      x, y, z, customdata,
      mode: 'markers',
      type: 'scatter3d',
      name: cluster.name,
      visible: true,
      hovertemplate:
        '<b>%{customdata.cluster_name}</b><br>' +
        '─────────────────<br>' +
        'Customer ID: %{customdata.customer_id}<br>' +
        'Recency: %{customdata.recency} days<br>' +
        'Frequency: %{customdata.frequency} orders<br>' +
        'Monetary: %{customdata.monetary_str}<br>' +
        '<extra></extra>',
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: cluster.color || '#6366f1',
        borderwidth: 1.5,
        font: { color: '#f1f5f9', family: 'Inter, system-ui, sans-serif', size: 13 },
      },
      marker: {
        color: cluster.color || '#6366f1',
        size: 3,
        opacity,
        line: {
          color: cluster.color || '#6366f1',
          width: 0.5,
        },
      },
    };
  }).filter((t) => t.x && t.x.length > 0);

function plotChart(el, clusters, mergedCustomers, opacity) {
  const data = buildTraces(clusters, mergedCustomers, opacity);

  const axisStyle = {
    title: { font: { size: 14, color: '#e2e8f0', family: 'Inter, system-ui, sans-serif' } },
    gridcolor: '#1e293b',
    gridwidth: 1.5,
    gridcnt: 6,
    tickfont: { size: 11, color: '#94a3b8' },
    zerolinecolor: '#334155',
    backgroundcolor: '#0f172a',
  };

  const rMax = Math.max(...clusters.map((c) => c.avg_recency));
  const fMax = Math.max(...clusters.map((c) => c.avg_frequency));
  const mMax = Math.max(...clusters.map((c) => c.avg_monetary));
  const pad = 0.35;

  const layout = {
    paper_bgcolor: '#0f172a',
    plot_bgcolor: '#0f172a',
    font: { color: '#cbd5e1', family: 'Inter, system-ui, sans-serif' },
    scene: {
      bgcolor: '#0f172a',
      xaxis: {
        ...axisStyle,
        title: { ...axisStyle.title, text: 'Recency (days)' },
        range: [0, rMax * (1 + pad)],
      },
      yaxis: {
        ...axisStyle,
        title: { ...axisStyle.title, text: 'Frequency (orders)' },
        range: [0, fMax * (1 + pad)],
      },
      zaxis: {
        ...axisStyle,
        title: { ...axisStyle.title, text: 'Monetary ($)' },
        range: [0, mMax * (1 + pad)],
      },
      camera: {
        eye: { x: 1.4, y: 1.4, z: 1.0 },
        center: { x: 0, y: 0, z: 0 },
      },
    },
    margin: { l: 10, r: 10, b: 10, t: 10 },
    legend: {
      bgcolor: 'rgba(15,23,42,0.95)',
      font: { color: '#e2e8f0', size: 13, family: 'Inter, system-ui, sans-serif' },
      bordercolor: '#475569',
      borderwidth: 1.5,
      x: 0.01,
      y: 0.99,
      xanchor: 'left',
      yanchor: 'top',
    },
  };

  Plotly.newPlot(el, data, layout, {
    responsive: true,
    displaylogo: false,
    scrollZoom: false,
  });
}

export default function Visualization3D() {
  const plotRef = useRef(null);
  const { clustering, loading: hookLoading, error: hookError, hasData } = useClustering();
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [visibleClusters, setVisibleClusters] = useState(null);
  const [currentView, setCurrentView] = useState('default');

  const clusters = clustering?.clusters ?? null;
  const mergedCustomers = useMemo(() => {
    if (!clustering?.clusters || !clustering.labels) return null;
    const grouped = new Map();
    for (const cluster of clustering.clusters) {
      grouped.set(cluster.name, []);
    }
    for (const l of clustering.labels) {
      if (grouped.has(l.cluster_name)) {
        grouped.get(l.cluster_name).push({
          customer_id: l.customer_id,
          recency: l.recency,
          frequency: l.frequency,
          monetary: l.monetary,
        });
      }
    }
    return grouped;
  }, [clustering]);

  // Initialize visible clusters when data loads
  useEffect(() => {
    if (clusters && clusters.length > 0) {
      setVisibleClusters(new Set(clusters.map((c) => c.name)));
      setSelectedCluster(null);
      setCurrentView('default');
    }
  }, [clusters && clusters[0]?.id]); // only trigger on new data, not every render

  const traceIndexByName = useMemo(() => {
    if (!clusters) return {};
    return Object.fromEntries(clusters.map((c, i) => [c.name, i]));
  }, [clusters]);

  // Initial chart render + legend click sync
  useEffect(() => {
    if (!plotRef.current || !clusters || !mergedCustomers) return;
    const baseOpacity = selectedCluster ? 0.15 : 0.8;
    plotChart(plotRef.current, clusters, mergedCustomers, baseOpacity);

    const el = plotRef.current;
    const onLegendClick = () => {
      const next = new Set();
      clusters.forEach((c) => {
        const idx = traceIndexByName[c.name];
        if (idx !== undefined && el.data[idx]?.visible !== false) {
          next.add(c.name);
        }
      });
      setVisibleClusters(next);
    };
    el.on('plotly_legendclick', onLegendClick);
    el.on('plotly_legenddoubleclick', onLegendClick);

    return () => {
      el.removeEventListener('plotly_legendclick', onLegendClick);
      el.removeEventListener('plotly_legenddoubleclick', onLegendClick);
      if (el.data) {
        Plotly.purge(el);
      }
    };
  }, [clusters, mergedCustomers]);

  // Highlight selected cluster (restyle — no recreation)
  useEffect(() => {
    if (!plotRef.current?.data || !clusters) return;
    const promises = clusters.map((c) => {
      const idx = traceIndexByName[c.name];
      const isSel = selectedCluster === c.name;
      return Plotly.restyle(plotRef.current, {
        opacity: [isSel ? 1.0 : (selectedCluster ? 0.15 : 0.8)],
        'marker.size': [isSel ? 5 : 3],
      }, [idx]);
    });
    Promise.all(promises).catch(() => {});
  }, [selectedCluster, clusters, traceIndexByName]);

  // Toggle cluster visibility (restyle)
  const toggleCluster = useCallback((name) => {
    setVisibleClusters((prev) => {
      const next = new Set(prev);
      const hiding = next.has(name);
      if (hiding) next.delete(name);
      else next.add(name);
      if (selectedCluster === name && hiding) setSelectedCluster(null);
      const idx = traceIndexByName[name];
      if (idx !== undefined) {
        Plotly.restyle(plotRef.current, {
          visible: hiding ? 'legendonly' : true,
        }, [idx]);
      }
      return next;
    });
  }, [traceIndexByName, selectedCluster]);

  // Camera preset (relayout)
  const setView = useCallback((key) => {
    const v = VIEWS[key];
    if (!v || !plotRef.current?.data) return;
    setCurrentView(key);
    Plotly.relayout(plotRef.current, {
      'scene.camera.eye': v.eye,
      transition: { duration: CAMERA_DURATION },
    });
  }, []);

  // Show all clusters
  const showAll = useCallback(() => {
    if (!clusters || !plotRef.current?.data) return;
    setVisibleClusters(new Set(clusters.map((c) => c.name)));
    clusters.forEach((c) => {
      const idx = traceIndexByName[c.name];
      if (idx !== undefined) {
        Plotly.restyle(plotRef.current, { visible: [true] }, [idx]);
      }
    });
  }, [clusters, traceIndexByName]);

  // Selected cluster stats
  const selectedStats = useMemo(() => {
    if (!selectedCluster || !clusters) return null;
    return clusters.find((c) => c.name === selectedCluster) || null;
  }, [selectedCluster, clusters]);

  // Business Intelligence computations
  const totalCustomers = useMemo(
    () => (clusters || []).reduce((s, c) => s + c.size, 0),
    [clusters],
  );
  const totalRevenue = useMemo(
    () => (clusters || []).reduce((s, c) => s + c.total_revenue, 0),
    [clusters],
  );
  const executiveSummary = useMemo(
    () => (clusters ? generateExecutiveSummary(clusters, totalCustomers) : ''),
    [clusters, totalCustomers],
  );
  const risks = useMemo(() => (clusters ? detectRisks(clusters) : []), [clusters]);
  const comparisonRows = useMemo(() => (clusters ? buildComparisonRows(clusters) : []), [clusters]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">
        3D RFM Visualization
      </h1>
      <p className="text-slate-400 text-sm mb-8">
        Interactive customer segmentation analysis with real-time clustering metrics
      </p>

      {hookLoading && (
        <div className="bg-slate-900 rounded-3xl overflow-hidden flex items-center justify-center" style={{ height: '700px' }}>
          <div className="text-slate-400">Loading clustering data...</div>
        </div>
      )}

      {hookError && !hookLoading && (
        <div className="bg-slate-900 rounded-3xl overflow-hidden flex flex-col items-center justify-center" style={{ height: '700px' }}>
          <p className="text-red-400">{hookError}</p>
        </div>
      )}

      {!hasData && !hookLoading && !hookError && (
        <EmptyState description="No 3D visualization available yet. Upload a dataset to compute clustering and explore customer segments in 3D space." linkText="Upload Dataset" />
      )}

      {!hookLoading && !hookError && hasData && (
        <>
          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {clusters.map((c) => {
              const isVisible = visibleClusters?.has(c.name) ?? true;
              const isSelected = selectedCluster === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => toggleCluster(c.name)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    setSelectedCluster(isSelected ? null : c.name);
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isVisible ? `${c.color}22` : '#1e293b',
                    borderColor: isVisible ? c.color : '#475569',
                    borderWidth: '1px',
                    color: isVisible ? c.color : '#64748b',
                    opacity: isSelected ? 1 : 0.9,
                    ring: isSelected ? `2px solid ${c.color}` : 'none',
                  }}
                  title={`Click: toggle ${c.name}. Double-click: isolate.`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: isVisible ? c.color : '#475569' }} />
                  {c.name}
                </button>
              );
            })}

            <div className="w-px h-6 bg-slate-700 mx-1" />

            <button onClick={showAll} className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700">
              Show All
            </button>
            {selectedCluster && (
              <button
                onClick={() => setSelectedCluster(null)}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              >
                Clear Selection
              </button>
            )}

            <div className="w-px h-6 bg-slate-700 mx-1" />

            {Object.entries(VIEWS).map(([key, v]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: currentView === key ? '#6366f122' : '#1e293b',
                  color: currentView === key ? '#818cf8' : '#94a3b8',
                  borderColor: currentView === key ? '#6366f1' : '#475569',
                  borderWidth: '1px',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Cluster Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {clusters.map((c) => {
              const customerCount = (mergedCustomers?.get(c.name) || []).length;
              const isSelected = selectedCluster === c.name;
              return (
                <div
                  key={c.name}
                  onClick={() => setSelectedCluster(isSelected ? null : c.name)}
                  className="rounded-2xl p-5 border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    borderColor: isSelected ? c.color : '#1e293b',
                    background: isSelected ? `${c.color}18` : '#0f172a',
                    boxShadow: isSelected ? `0 0 20px ${c.color}22` : '0 1px 3px rgba(0,0,0,0.3)',
                    opacity: selectedCluster && !isSelected ? 0.4 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <div className="text-sm font-semibold tracking-wide uppercase" style={{ color: c.color }}>
                      {c.name}
                    </div>
                  </div>
                  <div className="text-4xl font-bold mt-1 text-white">
                    {customerCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400 mt-1 font-medium">customers - {c.percentage}% share</div>
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Recency</span>
                      <span className="text-sm font-bold text-slate-200">{c.avg_recency} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Frequency</span>
                      <span className="text-sm font-bold text-slate-200">{c.avg_frequency} orders</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Monetary</span>
                      <span className="text-sm font-bold text-slate-200">${c.avg_monetary}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content: Chart + Stats Panel */}
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* 3D Chart */}
            <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden min-w-0">
              <div
                ref={plotRef}
                style={{
                  width: '100%',
                  height: '700px',
                }}
              />
            </div>

            {/* Selected Cluster Stats Panel */}
            {selectedStats && (
              <div
                className="lg:w-72 rounded-2xl p-5 flex-shrink-0 border"
                style={{
                  borderColor: `${selectedStats.color}44`,
                  background: `${selectedStats.color}0a`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedStats.color }}
                  />
                  <h3 className="text-lg font-bold text-white">{selectedStats.name}</h3>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-slate-800/60 rounded-xl p-3.5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Customers</div>
                    <div className="text-2xl font-bold text-white mt-1">{selectedStats.size.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Share</div>
                    <div className="text-2xl font-bold text-white mt-1">{selectedStats.percentage}%</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Avg Recency</div>
                    <div className="text-2xl font-bold text-white mt-1">{selectedStats.avg_recency} <span className="text-sm font-normal text-slate-400">days</span></div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Avg Frequency</div>
                    <div className="text-2xl font-bold text-white mt-1">{selectedStats.avg_frequency} <span className="text-sm font-normal text-slate-400">orders</span></div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Avg Monetary</div>
                    <div className="text-2xl font-bold text-white mt-1">${selectedStats.avg_monetary}</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Revenue</div>
                    <div className="text-2xl font-bold text-white mt-1">${selectedStats.total_revenue.toLocaleString()}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  Double-click a toggle button to isolate a cluster. Click again to deselect.
                </p>
              </div>
            )}
          </div>

          {/* ── Executive Summary ─────────────────────────────────────── */}
          {executiveSummary && executiveSummary.length > 0 && (
            <div className="mt-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">Executive Summary</h2>
              <div className="bg-slate-900 rounded-2xl p-6 border border-indigo-500/20">
                <div className="space-y-4">
                  {executiveSummary.map((b, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: b.highlight ? b.color : '#475569' }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{
                              color: b.color,
                              backgroundColor: `${b.color}18`,
                            }}
                          >
                            {b.label}
                          </span>
                          {b.highlight && (
                            <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                              Key Finding
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{b.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-700">
                  <div className="bg-slate-800/60 rounded-xl p-4">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Customers</div>
                    <div className="text-2xl font-bold text-white mt-1">{totalCustomers.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-4">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Revenue</div>
                    <div className="text-2xl font-bold text-white mt-1">${(totalRevenue / 1000).toFixed(1)}M</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-4">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Avg per Customer</div>
                    <div className="text-2xl font-bold text-white mt-1">${(totalRevenue / (totalCustomers || 1)).toFixed(0)}</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-4">
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Segments</div>
                    <div className="text-2xl font-bold text-white mt-1">{clusters.length}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Risk Detection ────────────────────────────────────────── */}
          {risks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Risk Detection</h2>
              <div className="space-y-3">
                {risks.map((risk, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 border-l-4 flex items-start gap-3"
                    style={{
                      borderColor: risk.level === 'critical' ? '#ef4444' : '#f59e0b',
                      background: risk.level === 'critical' ? '#ef44440a' : '#f59e0b0a',
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        background: risk.level === 'critical' ? '#ef444422' : '#f59e0b22',
                        color: risk.level === 'critical' ? '#f87171' : '#fbbf24',
                      }}
                    >
                      {risk.level === 'critical' ? '!!' : '!'}
                    </span>
                    <div>
                      <div className="text-sm font-semibold" style={{
                        color: risk.level === 'critical' ? '#f87171' : '#fbbf24',
                      }}>
                        {risk.title}
                      </div>
                      <div className="text-sm text-slate-400 mt-1">{risk.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Revenue Contribution ──────────────────────────────────── */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Revenue Contribution Analysis</h2>
            <div className="bg-slate-900 rounded-2xl p-6">
              {comparisonRows.map((c) => {
                const revShare = parseFloat(c.revenueShare);
                const custShare = c.percentage;
                const ratio = (revShare / (custShare || 1)).toFixed(1);
                const isOverIndex = parseFloat(ratio) > 1;
                return (
                  <div key={c.name} className="mb-5 last:mb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-sm font-semibold text-slate-200">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400 font-medium">
                          {custShare}% cust → {revShare}% rev
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${isOverIndex ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {isOverIndex ? '▲' : '▼'} {ratio}x
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${custShare}%`,
                            backgroundColor: `${c.color}66`,
                          }}
                        />
                      </div>
                      <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(revShare, 100)}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-xs text-slate-500 font-medium">Customer share</span>
                      <span className="text-xs text-slate-500 font-medium flex-1 text-right">Revenue share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Cluster Comparison Table ──────────────────────────────── */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Cluster Comparison Analytics</h2>
            <div className="bg-slate-900 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/40">
                    {['Segment', 'Customers', 'Share', 'Avg R', 'Avg F', 'Avg M', 'Total Revenue', 'Rev Share'].map((h) => (
                      <th key={h} className="text-left text-xs text-slate-400 px-4 py-3.5 font-bold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((c) => (
                    <tr key={c.name} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="font-semibold text-slate-200">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium">{c.size.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium">{c.percentage}%</td>
                      <td className="px-4 py-3.5 text-slate-300">{c.avg_recency}</td>
                      <td className="px-4 py-3.5 text-slate-300">{c.avg_frequency}</td>
                      <td className="px-4 py-3.5 text-slate-300">${c.avg_monetary}</td>
                      <td className="px-4 py-3.5 text-slate-200 font-medium">${c.total_revenue.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-sm" style={{ color: c.color }}>{c.revenueShare}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Insight Cards with Recommendations ────────────────────── */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Business Insights & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusters.map((c) => {
                const tmpl = INSIGHT_TEMPLATES[c.name];
                if (!tmpl) return null;
                return (
                  <div
                    key={c.name}
                    className="rounded-2xl p-6 border-l-4 bg-slate-900 transition-all hover:translate-y-[-2px]"
                    style={{ borderColor: c.color }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <h3 className="text-lg font-bold text-white">{c.name}</h3>
                      <span className="text-xs text-slate-500 ml-auto font-medium">{c.size.toLocaleString()} customers</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1 font-medium">{tmpl.desc}</p>
                    <p className="text-xs text-slate-500 mb-4">{tmpl.strength}</p>
                    <div className="mb-4">
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Key Metrics</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Recency</div>
                          <div className="text-lg font-bold text-white mt-0.5">{c.avg_recency}</div>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Frequency</div>
                          <div className="text-lg font-bold text-white mt-0.5">{c.avg_frequency}</div>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Monetary</div>
                          <div className="text-lg font-bold text-white mt-0.5">${c.avg_monetary}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Recommendations</div>
                      <ul className="space-y-1.5">
                        {tmpl.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                            <span style={{ color: c.color }} className="mt-px flex-shrink-0 font-bold">{"›"}</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cluster Legend */}
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            <span className="text-sm text-slate-400 font-medium">Clusters:</span>
            {clusters.map((c) => {
              const isVisible = visibleClusters?.has(c.name) ?? true;
              return (
                <div
                  key={c.name}
                  onClick={() => toggleCluster(c.name)}
                  className="flex items-center gap-2 cursor-pointer select-none"
                  style={{ opacity: isVisible ? 1 : 0.35 }}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: isVisible ? c.color : '#475569' }}
                  />
                  <span className="text-sm" style={{ color: isVisible ? '#e2e8f0' : '#64748b' }}>
                    {c.name}
                    <span className="text-slate-500 ml-1">({c.size})</span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
