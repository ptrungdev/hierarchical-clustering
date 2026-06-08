import { useState, useEffect } from 'react';
import { fetchDataset } from '../utils/api';
import { useAnalytics } from '../contexts/AnalyticsContext';

function computeStats(data) {
  const totalRevenue = data.reduce((s, r) => s + r.total_amount, 0);
  const totalTransactions = data.length;
  const totalCustomers = new Set(data.map((r) => r.customer_id)).size;
  const avgOrderValue = totalRevenue / totalTransactions;

  const countryMap = {};
  data.forEach((r) => {
    countryMap[r.country] = (countryMap[r.country] || 0) + r.total_amount;
  });
  const topCountries = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([country, revenue]) => ({ country, revenue: Math.round(revenue) }));

  const productMap = {};
  data.forEach((r) => {
    productMap[r.product_name] = (productMap[r.product_name] || 0) + r.total_amount;
  });
  const revenueDistribution = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([, revenue], i) => ({
      name: Object.keys(productMap).sort((a, b) => productMap[b] - productMap[a])[i],
      value: Math.round((revenue / totalRevenue) * 100),
      color: ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'][i],
    }));

  const monthMap = {};
  data.forEach((r) => {
    const m = r.purchase_date.substring(0, 7);
    if (!monthMap[m]) monthMap[m] = { revenue: 0, orders: 0 };
    monthMap[m].revenue += r.total_amount;
    monthMap[m].orders++;
  });
  const months = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      month: date.substring(5),
      revenue: Math.round(stats.revenue),
      orders: stats.orders,
    }));

  return {
    totalCustomers,
    totalRevenue: Math.round(totalRevenue),
    totalTransactions,
    avgOrderValue: Math.round(avgOrderValue),
    topCountries,
    revenueDistribution,
    months,
  };
}

export default function useDataset() {
  const { uploadedData } = useAnalytics();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (uploadedData) {
      const di = uploadedData.dataset_info;
      setStats({
        totalCustomers: di.total_customers,
        totalRevenue: di.total_revenue,
        totalTransactions: di.total_transactions,
        avgOrderValue: di.avg_order_value,
        topCountries: uploadedData.revenue_by_country,
        revenueDistribution: uploadedData.revenue_distribution,
        months: uploadedData.monthly_trends,
      });
      setHasData(true);
      setLoading(false);
      setError(null);
      return;
    }

    setStats(null);
    setHasData(false);
    setLoading(false);
    setError(null);
  }, [uploadedData]);

  return { stats, loading, error, hasData };
}
