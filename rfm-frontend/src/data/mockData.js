// Revenue data by month
export const revenueByMonth = [
  { month: 'Jan', revenue: 42000, orders: 320 },
  { month: 'Feb', revenue: 38000, orders: 290 },
  { month: 'Mar', revenue: 51000, orders: 410 },
  { month: 'Apr', revenue: 47000, orders: 380 },
  { month: 'May', revenue: 55000, orders: 440 },
  { month: 'Jun', revenue: 62000, orders: 500 },
  { month: 'Jul', revenue: 58000, orders: 470 },
  { month: 'Aug', revenue: 64000, orders: 520 },
  { month: 'Sep', revenue: 60000, orders: 480 },
  { month: 'Oct', revenue: 68000, orders: 550 },
  { month: 'Nov', revenue: 72000, orders: 580 },
  { month: 'Dec', revenue: 78000, orders: 630 },
];

// Revenue distribution by product category
export const revenueDistribution = [
  { name: 'Electronics', value: 35, color: '#6366f1' },
  { name: 'Clothing', value: 25, color: '#8b5cf6' },
  { name: 'Home & Garden', value: 20, color: '#06b6d4' },
  { name: 'Sports', value: 12, color: '#f59e0b' },
  { name: 'Books', value: 8, color: '#10b981' },
];

// Top countries by revenue
export const topCountries = [
  { country: 'USA', revenue: 185000, customers: 1240 },
  { country: 'UK', revenue: 142000, customers: 980 },
  { country: 'Germany', revenue: 118000, customers: 820 },
  { country: 'France', revenue: 95000, customers: 670 },
  { country: 'Canada', revenue: 87000, customers: 590 },
  { country: 'Australia', revenue: 72000, customers: 480 },
  { country: 'Japan', revenue: 65000, customers: 420 },
  { country: 'Brazil', revenue: 54000, customers: 350 },
];

// RFM score distributions
export const recencyScores = [
  { score: 1, count: 120 },
  { score: 2, count: 230 },
  { score: 3, count: 450 },
  { score: 4, count: 680 },
  { score: 5, count: 520 },
];

export const frequencyScores = [
  { score: 1, count: 580 },
  { score: 2, count: 490 },
  { score: 3, count: 380 },
  { score: 4, count: 290 },
  { score: 5, count: 140 },
];

export const monetaryScores = [
  { score: 1, count: 450 },
  { score: 2, count: 520 },
  { score: 3, count: 480 },
  { score: 4, count: 310 },
  { score: 5, count: 170 },
];

// Cluster summary data
export const clusterData = [
  {
    id: 0,
    name: 'VIP Customers',
    size: 520,
    percentage: 26,
    avgRecency: 2,
    avgFrequency: 4.8,
    avgMonetary: 4.6,
    totalRevenue: 285000,
    color: '#6366f1',
    description: 'High-value customers who purchase frequently and recently',
  },
  {
    id: 1,
    name: 'Loyal Customers',
    size: 480,
    percentage: 24,
    avgRecency: 5,
    avgFrequency: 4.5,
    avgMonetary: 3.8,
    totalRevenue: 198000,
    color: '#8b5cf6',
    description: 'Regular buyers with consistent engagement',
  },
  {
    id: 2,
    name: 'New Customers',
    size: 390,
    percentage: 19.5,
    avgRecency: 3,
    avgFrequency: 2.8,
    avgMonetary: 3.2,
    totalRevenue: 112000,
    color: '#06b6d4',
    description: 'Recent customers showing promising behavior',
  },
  {
    id: 3,
    name: 'Lost Customers',
    size: 550,
    percentage: 27,
    avgRecency: 4,
    avgFrequency: 2.2,
    avgMonetary: 2.5,
    totalRevenue: 121000,
    color: '#f59e0b',
    description: 'Previously active customers showing declining engagement',
  },
];

// Key metrics
export const keyMetrics = {
  totalCustomers: 1940,
  totalRevenue: 716000,
  avgOrderValue: 369,
  retentionRate: 68.5,
  totalOrders: 5580,
  customerLifetimeValue: 369,
};

// Silhouette score
export const silhouetteScore = 0.42;

// Cluster colour map — matches backend clustering.py
export const CLUSTER_COLORS = {
  'VIP Customers': '#6366f1',
  'Loyal Customers': '#a855f7',
  'New Customers': '#06b6d4',
  'Lost Customers': '#f59e0b',
};

// Customer dataset sample
export const customerSample = [
  { id: 'C001', recency: 2, frequency: 15, monetary: 1250, cluster: 'VIP Customers' },
  { id: 'C002', recency: 5, frequency: 12, monetary: 980, cluster: 'Loyal Customers' },
  { id: 'C003', recency: 3, frequency: 8, monetary: 750, cluster: 'New Customers' },
  { id: 'C004', recency: 4, frequency: 3, monetary: 320, cluster: 'Lost Customers' },
  { id: 'C005', recency: 5, frequency: 1, monetary: 85, cluster: 'Lost Customers' },
  { id: 'C006', recency: 1, frequency: 20, monetary: 2100, cluster: 'VIP Customers' },
  { id: 'C007', recency: 3, frequency: 10, monetary: 890, cluster: 'Loyal Customers' },
  { id: 'C008', recency: 2, frequency: 6, monetary: 540, cluster: 'New Customers' },
  { id: 'C009', recency: 4, frequency: 4, monetary: 410, cluster: 'Lost Customers' },
  { id: 'C010', recency: 5, frequency: 2, monetary: 120, cluster: 'Lost Customers' },
  { id: 'C011', recency: 1, frequency: 18, monetary: 1800, cluster: 'VIP Customers' },
  { id: 'C012', recency: 4, frequency: 11, monetary: 1050, cluster: 'Loyal Customers' },
  { id: 'C013', recency: 2, frequency: 7, monetary: 620, cluster: 'New Customers' },
  { id: 'C014', recency: 5, frequency: 2, monetary: 190, cluster: 'Lost Customers' },
  { id: 'C015', recency: 5, frequency: 1, monetary: 65, cluster: 'Lost Customers' },
];

// Preprocessing steps
export const preprocessingSteps = [
  {
    step: 1,
    title: 'Data Cleaning',
    description: 'Remove duplicates, handle missing values, and filter invalid records',
    status: 'completed',
    details: 'Removed 127 duplicate records, imputed 43 missing values using median',
  },
  {
    step: 2,
    title: 'Outlier Detection',
    description: 'Identify and cap outliers using IQR method',
    status: 'completed',
    details: 'Detected 89 outliers in monetary value, capped at 99th percentile',
  },
  {
    step: 3,
    title: 'RFM Score Calculation',
    description: 'Assign percentile-based scores (1-5) for each RFM dimension',
    status: 'completed',
    details: 'Used quintile binning for R, F, M scores',
  },
  {
    step: 4,
    title: 'Feature Scaling',
    description: 'Normalize features using MinMax scaling for clustering',
    status: 'completed',
    details: 'Scaled R, F, M values to [0, 1] range',
  },
  {
    step: 5,
    title: 'Dimensionality Reduction',
    description: 'Apply PCA for 3D visualization',
    status: 'completed',
    details: 'PCA components explain 87.3% of total variance',
  },
];

// Business insights
export const businessInsights = [
  {
    icon: 'target',
    title: 'Target VIP Customers for Loyalty Rewards',
    description: '520 VIP customers generate 39.8% of total revenue. Launch a loyalty rewards program to increase retention by an estimated 15%.',
    impact: 'High',
    action: 'Create VIP tier with exclusive benefits and early access',
  },
  {
    icon: 'alert-triangle',
    title: 'Re-engage Lost Customers',
    description: '550 lost customers represent $121K in potential lost revenue. Deploy targeted win-back email campaigns with personalized offers.',
    impact: 'High',
    action: 'Send 3-part re-engagement email sequence with 20% discount',
  },
  {
    icon: 'trending-up',
    title: 'Nurture New Customers',
    description: '390 new customers show promising patterns. Use cross-sell and upsell strategies to increase frequency.',
    impact: 'Medium',
    action: 'Implement product recommendation engine based on purchase history',
  },
  {
    icon: 'users',
    title: 'Geographic Expansion Opportunity',
    description: 'USA and UK account for 52% of revenue. Explore growth in emerging markets like Brazil and Japan.',
    impact: 'Medium',
    action: 'Conduct market research for localized campaigns in BRICS countries',
  },
  {
    icon: 'shopping-cart',
    title: 'Increase Average Order Value',
    description: 'Current AOV of $369 has room for improvement. Bundle recommendations can increase AOV by 12-18%.',
    impact: 'Medium',
    action: 'Implement "frequently bought together" suggestions on product pages',
  },
  {
    icon: 'bar-chart-2',
    title: 'Electronics Dominates Revenue',
    description: 'Electronics category drives 35% of revenue. Diversification into home & garden shows strong growth potential.',
    impact: 'Low',
    action: 'Expand home & garden product line based on customer preferences',
  },
];

// Dataset info
export const datasetInfo = {
  source: 'Online Retail Transaction Database',
  timePeriod: 'Jan 2024 - Dec 2024',
  totalRecords: 2067,
  totalFeatures: 8,
  features: [
    { name: 'Customer ID', type: 'Categorical', missing: 0 },
    { name: 'Recency (days)', type: 'Numeric', missing: 12 },
    { name: 'Frequency (orders)', type: 'Numeric', missing: 0 },
    { name: 'Monetary (USD)', type: 'Numeric', missing: 31 },
    { name: 'Country', type: 'Categorical', missing: 0 },
    { name: 'Product Category', type: 'Categorical', missing: 4 },
    { name: 'Last Order Date', type: 'Date', missing: 0 },
    { name: 'Customer Segment', type: 'Categorical', missing: 0 },
  ],
};

// Dendrogram data (mock linkage)
export const dendrogramData = {
  clusters: clusterData,
  optimalClusters: 5,
  method: 'Ward',
  distanceMetric: 'Euclidean',
};

// 3D scatter data (projected to 2D for mock)
export const scatter3DData = clusterData.flatMap((cluster) =>
  Array.from({ length: 20 }, (_, i) => ({
    x: cluster.id * 2.5 + (Math.random() - 0.5) * 3,
    y: (Math.random() - 0.5) * 4,
    z: (Math.random() - 0.5) * 4,
    cluster: cluster.name,
    color: cluster.color,
  }))
);

// Monthly trend per cluster
export const monthlyClusterTrend = [
  { month: 'Jan', 'VIP Customers': 320, 'Loyal Customers': 290, 'New Customers': 210, 'Lost Customers': 180 },
  { month: 'Feb', 'VIP Customers': 330, 'Loyal Customers': 300, 'New Customers': 220, 'Lost Customers': 175 },
  { month: 'Mar', 'VIP Customers': 345, 'Loyal Customers': 310, 'New Customers': 230, 'Lost Customers': 170 },
  { month: 'Apr', 'VIP Customers': 355, 'Loyal Customers': 315, 'New Customers': 235, 'Lost Customers': 168 },
  { month: 'May', 'VIP Customers': 370, 'Loyal Customers': 320, 'New Customers': 240, 'Lost Customers': 165 },
  { month: 'Jun', 'VIP Customers': 385, 'Loyal Customers': 330, 'New Customers': 245, 'Lost Customers': 160 },
  { month: 'Jul', 'VIP Customers': 395, 'Loyal Customers': 335, 'New Customers': 250, 'Lost Customers': 155 },
  { month: 'Aug', 'VIP Customers': 410, 'Loyal Customers': 340, 'New Customers': 255, 'Lost Customers': 150 },
  { month: 'Sep', 'VIP Customers': 420, 'Loyal Customers': 345, 'New Customers': 260, 'Lost Customers': 148 },
  { month: 'Oct', 'VIP Customers': 435, 'Loyal Customers': 350, 'New Customers': 265, 'Lost Customers': 145 },
  { month: 'Nov', 'VIP Customers': 450, 'Loyal Customers': 355, 'New Customers': 270, 'Lost Customers': 140 },
  { month: 'Dec', 'VIP Customers': 465, 'Loyal Customers': 360, 'New Customers': 275, 'Lost Customers': 135 },
];
