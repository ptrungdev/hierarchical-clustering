"""RFM calculation module — computes recency, frequency, monetary per customer."""
import numpy as np
import pandas as pd


def calculate_rfm(transactions: list[dict]) -> pd.DataFrame:
    """
    Calculate RFM metrics from a raw transaction list.

    Supports UCI Online Retail format:
    - Frequency = number of unique invoices (when invoice_no is present)
    - Monetary = sum of (Quantity x UnitPrice)
    - Recency = days since last purchase

    Analysis date = max(purchase_date) + 1 day so recency >= 0.

    Returns a sorted DataFrame (highest monetary first).
    """
    cols = ["customer_id", "purchase_date", "total_amount"]
    has_invoice = "invoice_no" in pd.DataFrame(transactions).columns
    if has_invoice:
        cols = cols + ["invoice_no"]

    df = pd.DataFrame(transactions)[cols].copy()
    df["purchase_date"] = pd.to_datetime(df["purchase_date"])

    analysis_date = df["purchase_date"].max() + pd.Timedelta(days=1)

    if has_invoice:
        rfm = df.groupby("customer_id").agg(
            frequency=("invoice_no", "nunique"),
            monetary=("total_amount", "sum"),
            last_purchase=("purchase_date", "max"),
        ).reset_index()
    else:
        rfm = df.groupby("customer_id").agg(
            frequency=("purchase_date", "count"),
            monetary=("total_amount", "sum"),
            last_purchase=("purchase_date", "max"),
        ).reset_index()

    # Recency = days since last purchase (lower is better)
    rfm["recency"] = (analysis_date - rfm["last_purchase"]).dt.days.astype(int)
    rfm["monetary"] = rfm["monetary"].round(2)

    rfm = rfm.drop(columns=["last_purchase"])
    rfm = rfm.sort_values("monetary", ascending=False).reset_index(drop=True)

    return rfm


def rfm_summary_stats(rfm_df: pd.DataFrame) -> dict:
    """Compute summary statistics for each RFM dimension."""
    stats = {}
    for col in ["recency", "frequency", "monetary"]:
        stats[col] = {
            "mean": round(float(rfm_df[col].mean()), 2),
            "median": round(float(rfm_df[col].median()), 2),
            "std": round(float(rfm_df[col].std()), 2),
            "min": round(float(rfm_df[col].min()), 2),
            "max": round(float(rfm_df[col].max()), 2),
            "q25": round(float(rfm_df[col].quantile(0.25)), 2),
            "q75": round(float(rfm_df[col].quantile(0.75)), 2),
        }
    return stats


def rfm_histogram(rfm_df: pd.DataFrame, column: str, bins: int = 20) -> list[dict]:
    """
    Bin a column into a histogram for charting using numpy histogram.

    Returns a list of dicts with 'label', 'start', 'end', 'count'.
    Zero-count bins are removed for cleaner charts.
    """
    counts, edges = np.histogram(rfm_df[column].dropna(), bins=bins)

    result = []
    for i in range(len(counts)):
        if counts[i] > 0:
            result.append({
                "label": f"{edges[i]:.0f}-{edges[i + 1]:.0f}",
                "start": round(edges[i], 2),
                "end": round(edges[i + 1], 2),
                "count": int(counts[i]),
            })

    return result


def top_customers(rfm_df: pd.DataFrame, n: int = 20) -> list[dict]:
    """Return top N customers by monetary value."""
    top = rfm_df.head(n).to_dict("records")
    return [
        {
            "rank": i + 1,
            "customer_id": r["customer_id"],
            "recency": int(r["recency"]),
            "frequency": int(r["frequency"]),
            "monetary": round(r["monetary"], 2),
        }
        for i, r in enumerate(top)
    ]
