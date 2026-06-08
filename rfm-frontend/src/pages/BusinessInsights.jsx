import { useMemo } from 'react';
import {
  Target, AlertTriangle, TrendingUp, Users, ShoppingCart, BarChart2, DollarSign,
} from 'lucide-react';
import Card from '../components/Card';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorBanner from '../components/ErrorBanner';
import EmptyState from '../components/EmptyState';
import useClustering from '../hooks/useClustering';

const iconMap = {
  vip: Target,
  retain: Users,
  reactivate: AlertTriangle,
  nurture: TrendingUp,
  aov: ShoppingCart,
  revenue: BarChart2,
};

const impactStyles = {
  High: 'bg-red-100 text-red-600',
  Medium: 'bg-amber-100 text-amber-600',
  Low: 'bg-emerald-100 text-emerald-600',
};

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

function generateInsights(clusters, silhouette) {
  const insights = [];
  const totalRevenue = clusters.reduce((s, c) => s + c.total_revenue, 0);
  const totalCustomers = clusters.reduce((s, c) => s + c.size, 0);
  const aov = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const vip = clusters.find((c) => c.name === 'VIP Customers');
  const loyal = clusters.find((c) => c.name === 'Loyal Customers');
  const lost = clusters.find((c) => c.name === 'Lost Customers');
  const newC = clusters.find((c) => c.name === 'New Customers');

  if (vip) {
    insights.push({
      icon: 'vip',
      title: `Launch VIP Program for ${vip.size} High-Value Customers`,
      description: `${vip.name} represent ${vip.percentage}% of the customer base but generate ${fmt(vip.total_revenue)} (${((vip.total_revenue / totalRevenue) * 100).toFixed(1)}% of total revenue) with an average frequency of ${vip.avg_frequency.toFixed(1)} orders and avg spend of ${fmt(vip.avg_monetary)} per order. A structured loyalty rewards program can increase retention by an estimated 12-18%.`,
      impact: 'High',
      action: `Create a tiered VIP program with exclusive benefits, early product access, and personalized concierge service for the top ${Math.round(vip.size * 0.2)} highest-spenders.`,
    });
  }

  if (lost) {
    insights.push({
      icon: 'reactivate',
      title: `Win-Back Campaign for ${lost.size} Lost Customers`,
      description: `${lost.name} account for ${lost.percentage}% of customers with low engagement — avg recency of ${lost.avg_recency.toFixed(0)} days, only ${lost.avg_frequency.toFixed(1)} orders, and ${fmt(lost.total_revenue)} total revenue. Deploying targeted re-engagement campaigns could recover an estimated ${fmt(lost.total_revenue * 0.3)} in annual revenue.`,
      impact: 'High',
      action: `Send a 3-part email sequence: (1) personalized "we miss you" with ${fmt(aov * 0.2)} discount, (2) product recommendations based on past purchases, (3) exclusive limited-time offer.`,
    });
  }

  if (loyal) {
    insights.push({
      icon: 'retain',
      title: `Retention Strategy for ${loyal.size} Loyal Customers`,
      description: `${loyal.name} show consistent purchasing behavior with ${loyal.avg_frequency.toFixed(1)} avg orders and ${fmt(loyal.avg_monetary)} avg spend, contributing ${fmt(loyal.total_revenue)} (${((loyal.total_revenue / totalRevenue) * 100).toFixed(1)}% of revenue). These customers are strong candidates for upselling and cross-selling to increase their lifetime value.`,
      impact: 'Medium',
      action: `Implement a "frequently bought together" recommendation engine and introduce a referral program offering ${fmt(aov * 0.15)} credit for each successful referral.`,
    });
  }

  if (newC) {
    insights.push({
      icon: 'nurture',
      title: `Onboard ${newC.size} New Customers to Increase Repeat Purchases`,
      description: `${newC.name} comprise ${newC.percentage}% of the base with ${newC.avg_frequency.toFixed(1)} avg orders and ${fmt(newC.avg_monetary)} avg spend. Their avg recency of ${newC.avg_recency.toFixed(0)} days suggests recent activity — an ideal window to establish repeat purchase habits before attrition.`,
      impact: 'Medium',
      action: `Deploy a 30-day post-purchase email sequence featuring product tutorials, bundle deals, and a second-purchase incentive expiring in 21 days.`,
    });
  }

  insights.push({
    icon: 'aov',
    title: 'Increase Average Order Value Through Bundling',
    description: `Current AOV across all segments is ${fmt(aov)}. Implementing strategic product bundles and free-shipping thresholds can increase AOV by 12-20%, generating an additional ${fmt(totalRevenue * 0.15)} in incremental revenue without acquiring new customers.`,
    impact: 'Medium',
    action: `Set free-shipping threshold at ${fmt(aov * 1.4)} and create 3 curated product bundles priced ${fmt(aov * 0.8)}-${fmt(aov * 1.2)} based on co-purchase analysis.`,
  });

  insights.push({
    icon: 'revenue',
    title: 'Revenue Concentration & Segment Diversification',
    description: `Revenue is distributed across ${clusters.length} segments. The top 2 segments generate ${fmt(clusters.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 2).reduce((s, c) => s + c.total_revenue, 0))} (${((clusters.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 2).reduce((s, c) => s + c.total_revenue, 0) / totalRevenue) * 100).toFixed(1)}% of total), indicating moderate concentration risk. Diversifying revenue across segments reduces dependency on any single group.`,
    impact: 'Low',
    action: `Monitor segment revenue share monthly and set alerts if any segment falls below 10% of total revenue for 3 consecutive months.`,
  });

  return insights;
}

function revenueBreakdown(clusters) {
  const totalRevenue = clusters.reduce((s, c) => s + c.total_revenue, 0);
  const sorted = [...clusters].sort((a, b) => b.total_revenue - a.total_revenue);
  let cumulative = 0;
  return sorted.map((c) => {
    cumulative += c.total_revenue;
    return {
      ...c,
      share: ((c.total_revenue / totalRevenue) * 100).toFixed(1),
      cumulative: ((cumulative / totalRevenue) * 100).toFixed(1),
    };
  });
}

export default function BusinessInsights() {
  const { clustering, loading, error, hasData } = useClustering();

  const insights = useMemo(() => {
    if (!clustering?.clusters) return [];
    return generateInsights(clustering.clusters, clustering.silhouette);
  }, [clustering]);

  const breakdown = useMemo(() => {
    if (!clustering?.clusters) return [];
    return revenueBreakdown(clustering.clusters);
  }, [clustering]);

  const totalRevenue = useMemo(() =>
    clustering?.clusters.reduce((s, c) => s + c.total_revenue, 0) ?? 0,
    [clustering],
  );

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!hasData) return <EmptyState description="No business insights available yet. Upload a dataset to generate actionable recommendations from clustering analysis." linkText="Upload Dataset" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Business Insights</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Actionable recommendations generated from real clustering analysis
        </p>
      </div>

      {/* Revenue Breakdown Panel */}
      <Card title="Revenue Breakdown" description={`Total revenue: ${fmt(totalRevenue)} across ${clustering.clusters.length} segments`}>
        <div className="px-5 pb-5">
          <div className="space-y-3">
            {breakdown.map((seg) => {
              const Icon = iconMap.revenue;
              return (
                <div key={seg.id} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <div className="w-28 shrink-0">
                    <p className="text-xs font-semibold text-slate-700">{seg.name}</p>
                    <p className="text-[10px] text-slate-400">{seg.size.toLocaleString()} customers</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${seg.share}%`, backgroundColor: seg.color + '30' }}
                      >
                        <span className="text-[10px] font-semibold text-slate-600">{seg.share}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <p className="text-xs font-bold text-slate-700">{fmt(seg.total_revenue)}</p>
                    <p className="text-[10px] text-slate-400">cum. {seg.cumulative}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, i) => {
          const Icon = iconMap[insight.icon] || BarChart2;
          return (
            <Card key={i} className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">{insight.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${impactStyles[insight.impact]}`}>
                      {insight.impact} Impact
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{insight.description}</p>
                  <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
                    <p className="text-xs text-primary font-medium">
                      <span className="font-semibold">Recommended Action:</span> {insight.action}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Key Takeaways */}
      <Card title="Key Takeaways">
        <div className="px-6 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 p-5 border border-primary/10">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Revenue Opportunity
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Re-engaging the at-risk segments could recover an estimated {fmt(totalRevenue * 0.1)} in annual revenue.
                Combined with a 15% retention boost from a VIP loyalty program, the total upside is approximately{' '}
                {fmt(totalRevenue * 0.18)} in incremental revenue over 12 months.
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 border border-emerald-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Strategic Priority
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Focus immediate efforts on the 2 high-impact actions: VIP program for top-spenders and re-engagement
                campaigns for lost customers. These initiatives address the segments responsible for{' '}
                {fmt(breakdown.slice(0, 2).reduce((s, c) => s + c.total_revenue, 0))} ({breakdown.slice(0, 2).reduce((s, c) => s + parseFloat(c.share), 0).toFixed(1)}%) of total revenue.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
