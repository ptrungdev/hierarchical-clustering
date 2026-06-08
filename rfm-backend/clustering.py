"""Hierarchical clustering module for RFM customer segmentation.

Clustering approach:
1. Standardize RFM features (StandardScaler) so each dimension has equal weight.
2. Build a linkage matrix with scipy's ward method for dendrogram visualization.
3. Apply AgglomerativeClustering (Ward linkage, 4 clusters) to assign each customer.
4. Compute silhouette score to evaluate cluster quality.
5. Label clusters by analysing their mean RFM profiles.
   - VIP:      low recency, high frequency, high monetary
   - Loyal:    moderate recency, high frequency, moderate monetary
   - New:      low recency, low frequency, moderate monetary
   - Lost:     high recency, low frequency, low monetary
"""

import io
import warnings

import matplotlib
matplotlib.use("Agg", force=True)
warnings.filterwarnings("ignore", category=UserWarning, module="matplotlib")
import matplotlib.pyplot as plt

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, dendrogram
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler


# ─── Cluster Naming ──────────────────────────────────────────────────────────
# Ordered so the label picker matches expected segment order.
CLUSTER_NAMES = ["VIP Customers", "Loyal Customers", "New Customers", "Lost Customers"]

# Colour palette sent to the frontend for consistent charts.
CLUSTER_COLORS = {
    "VIP Customers":     "#6366f1",
    "Loyal Customers":   "#a855f7",
    "New Customers":     "#06b6d4",
    "Lost Customers":    "#f59e0b",
}

# Map scipy dendrogram matplotlib color cycle names to CSS hex colors.
# scipy uses 'C0', 'C1', ... for its default color cycle.
MATPLOTLIB_COLOR_MAP = {
    "C0": "#1f77b4",
    "C1": "#ff7f0e",
    "C2": "#2ca02c",
    "C3": "#d62728",
    "C4": "#9467bd",
    "C5": "#8c564b",
    "C6": "#e377c2",
    "C7": "#7f7f7f",
    "C8": "#bcbd22",
    "C9": "#17becf",
    # Single-letter scipy dendrogram colors
    "R": "#d62728",
    "B": "#1f77b4",
    "G": "#2ca02c",
    "k": "#374151",
}


def _label_clusters(rfm_df: pd.DataFrame, labels: np.ndarray) -> dict[int, str]:
    """
    Map numeric cluster labels to human-readable names.

    Logic: compute the mean R, F, M for each cluster and assign the name
    that best matches the expected profile. Handles 2-4 clusters.
    """
    profiles = rfm_df.copy()
    profiles["cluster"] = labels

    summary = profiles.groupby("cluster").agg(
        mean_r=("recency", "mean"),
        mean_f=("frequency", "mean"),
        mean_m=("monetary", "mean"),
    )

    mapping = {}
    available = set(summary.index.tolist())

    if len(available) >= 1:
        vip_score = (-summary["mean_r"] + summary["mean_f"] + summary["mean_m"])
        mapping[vip_score.idxmax()] = "VIP Customers"
        available.remove(vip_score.idxmax())

    if len(available) >= 1:
        remaining = summary[summary.index.isin(available)]
        lost_score = remaining["mean_r"] - remaining["mean_f"] - remaining["mean_m"]
        lost_idx = lost_score.idxmax()
        mapping[lost_idx] = "Lost Customers"
        available.remove(lost_idx)

    if len(available) >= 1:
        remaining = summary[summary.index.isin(available)]
        loyal_idx = remaining["mean_f"].idxmax()
        mapping[loyal_idx] = "Loyal Customers"
        available.remove(loyal_idx)

    for idx in available:
        mapping[idx] = "New Customers"

    return mapping


# ─── Public API ──────────────────────────────────────────────────────────────

def run_clustering(rfm_df: pd.DataFrame, n_clusters: int = 4) -> dict:
    """
    Perform hierarchical clustering on RFM data.

    Parameters
    ----------
    rfm_df : DataFrame with columns [customer_id, recency, frequency, monetary]
    n_clusters : target number of segments

    Returns
    -------
    dict with keys:
      labels       – {customer_id: label, ...}
      cluster_name – {customer_id: name, ...}
      silhouette   – float
      clusters     – per-segment summary list
      mapping      – {numeric_label: name}
    """
    features = rfm_df[["recency", "frequency", "monetary"]].values

    # 1. Standardize so every dimension weighs equally
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    # Adjust cluster count for small datasets (silhouette needs n_clusters < n_samples)
    actual_clusters = min(n_clusters, max(2, len(rfm_df) - 1))

    # 2. Agglomerative clustering (Ward minimises within-cluster variance)
    model = AgglomerativeClustering(
        n_clusters=actual_clusters,
        linkage="ward",
    )
    labels = model.fit_predict(features_scaled)

    # 3. Silhouette score (mean distance to own cluster vs nearest cluster)
    try:
        sil = float(silhouette_score(features_scaled, labels))
    except ValueError:
        sil = 0.0

    # 4. Human-readable labels
    label_map = _label_clusters(rfm_df, labels)

    rfm_df = rfm_df.copy()
    rfm_df["cluster_label"] = labels
    rfm_df["cluster_name"] = [label_map[l] for l in labels]

    # 5. Per-cluster summary
    summaries = []
    for num_label, name in sorted(label_map.items(), key=lambda x: x[0]):
        sub = rfm_df[rfm_df["cluster_label"] == num_label]
        summaries.append({
            "id": int(num_label),
            "name": name,
            "size": int(sub.shape[0]),
            "percentage": round(len(sub) / len(rfm_df) * 100, 1),
            "avg_recency": round(float(sub["recency"].mean()), 1),
            "avg_frequency": round(float(sub["frequency"].mean()), 1),
            "avg_monetary": round(float(sub["monetary"].mean()), 2),
            "total_revenue": round(float(sub["monetary"].sum()), 2),
            "color": CLUSTER_COLORS[name],
        })

    # 6. Per-customer flat list (includes RFM values for 3D visualization)
    labels_flat = rfm_df[["customer_id", "recency", "frequency", "monetary", "cluster_label", "cluster_name"]].to_dict("records")

    return {
        "labels": labels_flat,
        "silhouette": round(sil, 4),
        "clusters": summaries,
        "mapping": {int(k): v for k, v in label_map.items()},
    }


def build_dendrogram(rfm_df: pd.DataFrame) -> dict:
    """
    Build a hierarchical linkage matrix and return dendrogram branch data.

    For performance we cap the number of observations at 300 (subsample).
    Full linkage matrices for 5 000 customers are very large for JSON.

    Returns
    -------
    dict with dendrogram coordinates and metadata for frontend rendering.
    """
    features = rfm_df[["recency", "frequency", "monetary"]].values

    # Subsample for a readable dendrogram
    max_obs = 1000
    if len(features) > max_obs:
        rng = np.random.default_rng(42)
        idx = rng.choice(len(features), max_obs, replace=False)
        features = features[idx]

    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    # Ward linkage: merges clusters that increase total variance the least
    Z = linkage(features_scaled, method="ward")

    # to_dendrogram returns coordinates suitable for SVG rendering
    dd = dendrogram(Z, p=len(Z), no_plot=True)

    # Cut height for 4 clusters: the merge that reduces 5 → 4 clusters
    n = len(features)
    cut_height_4 = float(Z[n - 4, 2]) if n >= 4 else 0.0

    return {
        "icoord": dd["icoord"],
        "dcoord": dd["dcoord"],
        "leaves": dd["leaves"],
        "color_list": [MATPLOTLIB_COLOR_MAP.get(c, "#6b7280") for c in dd["color_list"]],
        "n_obs": len(features),
        "linkage_height": float(Z[-1, 2]),
        "cut_height": cut_height_4,
        "linkage": Z.tolist(),  # full linkage matrix for tree rendering
    }


def generate_dendrogram_image(rfm_df: pd.DataFrame, n_clusters: int = 4) -> bytes:
    """
    Render a compact academic-style dendrogram as a PNG image.

    Uses 300 randomly sampled customers (seed=42) for a clean display.
    Returns PNG image bytes suitable for direct display in a browser <img> tag.
    """
    features = rfm_df[["recency", "frequency", "monetary"]].values

    # Subsample to 1000 for a clean dendrogram
    max_obs = 1000
    if len(features) > max_obs:
        rng = np.random.default_rng(42)
        idx = rng.choice(len(features), max_obs, replace=False)
        idx.sort()
        features = features[idx]

    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    Z = linkage(features_scaled, method="ward")
    n = len(features)
    cut_height = float(Z[n - n_clusters, 2]) if n >= n_clusters else 0.0

    # --- Build compact figure ---
    fig, ax = plt.subplots(figsize=(12, 4.5), facecolor="#ffffff")
    ax.set_facecolor("#fafbfc")

    # Render dendrogram — truncate to last 30 merges
    p = min(30, len(Z))
    dd = dendrogram(
        Z,
        truncate_mode="lastp",
        p=p,
        ax=ax,
        leaf_font_size=6,
        show_contracted=True,
    )

    # Color branch lines to match cluster segments
    _PALETTE = {
        "C0": "#6366f1", "C1": "#a855f7", "C2": "#06b6d4", "C3": "#f59e0b",
        "C4": "#9467bd", "C5": "#8c564b", "C6": "#e377c2", "C7": "#7f7f7f",
        "R": "#ef4444", "B": "#6366f1", "G": "#22c55e", "k": "#64748b",
    }
    for line, color in zip(ax.get_lines(), dd["color_list"]):
        line.set_color(_PALETTE.get(color, "#94a3b8"))

    # Red cut-threshold dashed line
    ax.axhline(
        y=cut_height,
        color="#ef4444",
        linewidth=1.2,
        linestyle="--",
        alpha=0.8,
    )

    # Small badge label
    _, max_x = ax.get_xlim()
    ax.annotate(
        f"{n_clusters} clusters",
        xy=(max_x, cut_height),
        xytext=(max_x - 40, cut_height + 0.8),
        fontsize=8,
        fontweight="500",
        color="#ef4444",
        ha="right",
        bbox=dict(
            boxstyle="round,pad=0.25",
            facecolor="#fff1f2",
            edgecolor="#fca5a5",
            alpha=0.9,
        ),
    )

    # Axis labels — no title (the Card provides the title)
    ax.set_xlabel("Customers", fontsize=9, color="#64748b", labelpad=6)
    ax.set_ylabel("Distance", fontsize=9, color="#64748b", labelpad=4)
    ax.tick_params(colors="#94a3b8", labelsize=7)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#e2e8f0")
    ax.spines["bottom"].set_color("#e2e8f0")

    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.getvalue()
