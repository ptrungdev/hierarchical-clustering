"""RFM Dataset API — FastAPI application with endpoints."""
import base64
import io
import uvicorn
import pandas as pd
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.exceptions import HTTPException

from clustering import run_clustering, build_dendrogram, generate_dendrogram_image
from dataset import generate_dataset
from rfm import (
    calculate_rfm,
    rfm_summary_stats,
    rfm_histogram,
    top_customers,
)

app = FastAPI(title="RFM Dataset API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# No pre-computed cache — the system starts empty.
# Upload a dataset via POST /api/upload-dataset to generate results.
_uploaded_cache = None


@app.get("/")
def root():
    return {
        "message": "RFM Dataset API",
        "endpoints": ["/api/dataset", "/api/rfm", "/api/clustering", "/api/dendrogram", "/api/upload-dataset", "/api/export/csv", "/api/export/excel", "/api/export/pdf"],
    }


@app.get("/api/dataset")
def get_dataset():
    """Return raw transaction dataset. Returns has_data: false if no dataset uploaded."""
    if _uploaded_cache is None:
        return {"has_data": False}
    cache = _uploaded_cache
    return {
        "has_data": True,
        "total_records": cache["total_records"],
        "total_customers": len(cache["rfm_df"]),
        "columns": [
            "customer_id", "invoice_no", "purchase_date",
            "quantity", "unit_price", "total_amount",
            "country", "product_name",
        ],
        "data": cache["dataset"],
    }


@app.get("/api/rfm")
def get_rfm():
    """Return RFM metrics. Returns has_data: false if no dataset uploaded."""
    if _uploaded_cache is None:
        return {"has_data": False}
    cache = _uploaded_cache
    rfm_df = cache["rfm_df"]
    return {
        "has_data": True,
        "total_customers": len(rfm_df),
        "reference_date": cache["ref_date"],
        "rfm": rfm_df.to_dict("records"),
        "summary": rfm_summary_stats(rfm_df),
        "recency_histogram": rfm_histogram(rfm_df, "recency", bins=15),
        "frequency_histogram": rfm_histogram(rfm_df, "frequency", bins=20),
        "monetary_histogram": rfm_histogram(rfm_df, "monetary", bins=20),
        "top_customers": top_customers(rfm_df, n=20),
    }


@app.get("/api/clustering")
def get_clustering():
    """Return clustering results. Returns has_data: false if no dataset uploaded."""
    if _uploaded_cache is None:
        return {"has_data": False}
    return {"has_data": True, **_uploaded_cache["clustering"]}


@app.get("/api/dendrogram")
def get_dendrogram():
    """Return dendrogram data. Returns has_data: false if no dataset uploaded."""
    if _uploaded_cache is None:
        return {"has_data": False}
    return {"has_data": True, **_uploaded_cache["dendrogram"]}


@app.get("/api/dendrogram-image")
def get_dendrogram_image():
    """Return dendrogram PNG. Returns 404 if no dataset uploaded."""
    if _uploaded_cache is None:
        raise HTTPException(status_code=404, detail="No dataset loaded. Upload a dataset first.")
    dendro_b64 = _uploaded_cache["dendrogram_image"]
    png = base64.b64decode(dendro_b64)
    return Response(content=png, media_type="image/png")


@app.get("/api/export/csv")
def export_rfm_csv():
    """Export RFM scores with cluster assignments as CSV."""
    if _uploaded_cache is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Upload a dataset first.")
    cache = _uploaded_cache
    rfm_df = cache["rfm_df"].copy()
    result = cache["clustering"]
    mapping = {r["customer_id"]: r for r in result["labels"]}
    rfm_df["cluster_name"] = rfm_df["customer_id"].map(lambda cid: mapping[cid]["cluster_name"])
    buf = io.StringIO()
    rfm_df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rfm_scores.csv"},
    )


@app.get("/api/export/excel")
def export_clustering_excel():
    """Export clustering results to multi-sheet Excel file."""
    if _uploaded_cache is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Upload a dataset first.")
    cache = _uploaded_cache
    rfm_df = cache["rfm_df"].copy()
    result = cache["clustering"]
    mapping = {r["customer_id"]: r for r in result["labels"]}
    rfm_df["cluster_name"] = rfm_df["customer_id"].map(lambda cid: mapping[cid]["cluster_name"])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        rfm_df.to_excel(writer, sheet_name="RFM_Scores", index=False)
        cluster_df = pd.DataFrame(result["clusters"])
        cluster_df.to_excel(writer, sheet_name="Cluster_Summary", index=False)
        for cluster in result["clusters"]:
            sub = rfm_df[rfm_df["cluster_name"] == cluster["name"]].nlargest(20, "monetary")
            sub.to_excel(writer, sheet_name=f"{cluster['name'][:31]}", index=False)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=clustering_report.xlsx"},
    )


@app.get("/api/export/pdf")
def export_dashboard_pdf():
    """Export dashboard summary as PDF."""
    if _uploaded_cache is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Upload a dataset first.")
    from fpdf import FPDF
    cache = _uploaded_cache
    dataset = cache["dataset"]
    rfm_df = cache["rfm_df"]
    result = cache["clustering"]
    total_revenue = round(float(rfm_df["monetary"].sum()), 2)
    total_transactions = len(dataset)
    total_customers = len(rfm_df)
    aov = total_revenue / total_customers if total_customers else 0
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(99, 102, 241)
    pdf.cell(0, 12, "RFM Customer Segmentation Report", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, f"Generated from {total_customers:,} customers  |  {total_transactions:,} transactions", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "Key Metrics", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 11)
    metrics = [
        ("Total Customers", f"{total_customers:,}"),
        ("Total Transactions", f"{total_transactions:,}"),
        ("Total Revenue", f"${total_revenue:,.2f}"),
        ("Avg Order Value", f"${aov:,.2f}"),
        ("Silhouette Score", f"{result['silhouette']:.4f}"),
    ]
    for label, val in metrics:
        pdf.set_text_color(71, 85, 105)
        pdf.cell(70, 6, label)
        pdf.set_text_color(30, 41, 59)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(60, 6, val)
        pdf.set_font("Helvetica", "", 11)
        pdf.ln()
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "Cluster Summary", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_fill_color(99, 102, 241)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    col_widths = [45, 18, 25, 22, 22, 22, 26]
    headers = ["Segment", "Size", "% Share", "Avg R", "Avg F", "Avg M", "Revenue"]
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_text_color(51, 65, 85)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_fill_color(241, 245, 249)
    for idx, c in enumerate(result["clusters"]):
        fill = idx % 2 == 0
        row = [c["name"], str(c["size"]), f"{c['percentage']}%", f"{c['avg_recency']:.1f}", f"{c['avg_frequency']:.1f}", f"{c['avg_monetary']:.2f}", f"${c['total_revenue']:,.2f}"]
        for i, val in enumerate(row):
            pdf.cell(col_widths[i], 7, val, border=1, fill=fill, align="C" if i > 1 else "L")
        pdf.ln()
    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, "Business Insights & Recommendations", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(71, 85, 105)
    insights = [
        f"VIP Customers ({sum(1 for l in result['labels'] if l['cluster_name']=='VIP Customers'):,} customers) generate the highest revenue per order. Implement a loyalty rewards program to increase retention.",
        f"Lost Customers ({sum(1 for l in result['labels'] if l['cluster_name']=='Lost Customers'):,} customers) show low engagement. Deploy win-back campaigns with personalized offers.",
        "Nurture Loyal and New Customers with targeted cross-sell strategies to increase purchase frequency.",
        f"Average Order Value of ${aov:,.2f} can be improved through product bundling and free-shipping thresholds.",
    ]
    for i, insight in enumerate(insights, 1):
        pdf.multi_cell(0, 5, f"{i}. {insight}")
        pdf.ln(2)
    buf = io.BytesIO()
    pdf.output(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=dashboard_report.pdf"},
    )


# ─── Upload + Full Pipeline ─────────────────────────────────────────────

# Accept common naming conventions (CamelCase, snake_case, title, spaced)
# Keys are normalized: lowercased, spaces/hyphens replaced with underscores
_COLUMN_ALIASES = {
    # Customer ID variants (Online Retail: CustomerID)
    "customerid": "customer_id",
    "customer_id": "customer_id",
    "customerid_": "customer_id",
    "customer": "customer_id",
    "custid": "customer_id",
    "cid": "customer_id",
    # Invoice date variants (Online Retail: InvoiceDate)
    "invoicedate": "purchase_date",
    "invoice_date": "purchase_date",
    "purchase_date": "purchase_date",
    "orderdate": "purchase_date",
    "order_date": "purchase_date",
    "transactiondate": "purchase_date",
    "transaction_date": "purchase_date",
    "date": "purchase_date",
    "invoice_datetime": "purchase_date",
    "invoicedatetime": "purchase_date",
    # Quantity
    "quantity": "quantity",
    "qty": "quantity",
    "units": "quantity",
    # Unit price variants (Online Retail: UnitPrice)
    "unitprice": "unit_price",
    "unit_price": "unit_price",
    "price": "unit_price",
    "amount": "unit_price",
    # Invoice number (Online Retail: InvoiceNo)
    "invoiceno": "invoice_no",
    "invoice_no": "invoice_no",
    "invoice_number": "invoice_no",
    "invoicenumber": "invoice_no",
    "invno": "invoice_no",
    "order_id": "invoice_no",
    "orderid": "invoice_no",
    "transaction_id": "invoice_no",
    # Stock code (Online Retail: StockCode)
    "stockcode": "stock_code",
    "stock_code": "stock_code",
    "sku": "stock_code",
    "product_code": "stock_code",
    "productcode": "stock_code",
    # Description (Online Retail: Description)
    "description": "description",
    "desc": "description",
    "product_description": "description",
    "productdescription": "description",
    # Country
    "country": "country",
    # Product category / name
    "productcategory": "product_name",
    "product_category": "product_name",
    "productname": "product_name",
    "product_name": "product_name",
    "product": "product_name",
    "category": "product_name",
}
_REQUIRED = {"customer_id", "purchase_date", "quantity", "unit_price"}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Map uploaded column names to internal canonical names.

    Handles Online Retail format out of the box:
    - Case-insensitive matching
    - Trims leading/trailing whitespace
    - Normalizes spaces, hyphens, and multiple underscores to single underscore
    - Recognizes CamelCase like 'CustomerID', 'InvoiceDate', 'UnitPrice'
    """
    mapping = {}
    for col in df.columns:
        # Lowercase, strip, replace spaces/hyphens with underscore, collapse multiples
        key = col.strip().lower()
        key = key.replace("-", "_").replace(" ", "_")
        key = "_".join([p for p in key.split("_") if p])  # remove empty parts
        if key in _COLUMN_ALIASES:
            mapping[col] = _COLUMN_ALIASES[key]
    df = df.rename(columns=mapping)
    # deduplicate if multiple columns mapped to the same name
    seen = {}
    to_drop = []
    for c in df.columns:
        if c in seen:
            to_drop.append(c)
        else:
            seen[c] = True
    if to_drop:
        df = df.drop(columns=to_drop)
    return df


@app.post("/api/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accept a CSV file, validate, clean, run full RFM + clustering pipeline,
    and return everything the dashboard needs to refresh.

    Returns:
    - dataset_info: total_transactions, total_customers, date_range, columns_detected
    - rfm_summary: mean/median/std/min/max/q25/q75 per dimension
    - histograms: recency/frequency/monetary bins
    - top_customers: top 20 spenders
    - clustering: labels, clusters, silhouette, mapping
    - dendrogram: icoord, dcoord, leaves, color_list, n_obs
    - dendrogram_image: base64-encoded PNG
    """
    allowed_ext = (".csv", ".xlsx", ".xls")
    if not file.filename or not file.filename.lower().endswith(allowed_ext):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a CSV or Excel file.",
        )

    raw = await file.read()
    ext = file.filename.lower().split(".")[-1]
    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(raw))
        else:
            df = pd.read_excel(io.BytesIO(raw), engine="openpyxl")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse {ext.upper()}: {e}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The CSV file is empty.")

    # ── Normalize column names ──
    df = _normalize_columns(df)

    missing = _REQUIRED - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {sorted(missing)}. "
                   f"Detected columns: {list(df.columns)}",
        )

    original_rows = len(df)

    # ── Normalize types first ──
    df["customer_id"] = df["customer_id"].astype(str).str.strip()
    if "invoice_no" in df.columns:
        df["invoice_no"] = df["invoice_no"].astype(str).str.strip()

    # ── Build removal reason mask (first match wins for counting) ──
    is_cancel = False
    if "invoice_no" in df.columns:
        is_cancel = df["invoice_no"].str.upper().str.startswith("C")

    is_missing_cust = df["customer_id"].isna() | (df["customer_id"] == "nan") | (df["customer_id"] == "")

    df["_date_parsed"] = pd.to_datetime(df["purchase_date"], errors="coerce", dayfirst=False)
    is_bad_date = df["_date_parsed"].isna()

    df["_qty_parsed"] = pd.to_numeric(df["quantity"], errors="coerce")
    is_bad_qty = df["_qty_parsed"].isna() | (df["_qty_parsed"] <= 0)

    df["_price_parsed"] = pd.to_numeric(df["unit_price"], errors="coerce")
    is_bad_price = df["_price_parsed"].isna() | (df["_price_parsed"] <= 0)

    # Count each reason (a row may match multiple; attribute to first)
    removed_canceled = int(is_cancel.sum())
    remaining_after_cancel = ~is_cancel
    removed_missing_customer = int((is_missing_cust & remaining_after_cancel).sum())
    removed_bad_date = int((is_bad_date & ~is_cancel & ~is_missing_cust).sum())
    removed_bad_qty = int((is_bad_qty & ~is_cancel & ~is_missing_cust & ~is_bad_date).sum())
    removed_bad_price = int((is_bad_price & ~is_cancel & ~is_missing_cust & ~is_bad_date & ~is_bad_qty).sum())
    removed_invalid = removed_missing_customer + removed_bad_date + removed_bad_qty + removed_bad_price

    # Remove all invalid rows at once
    remove_mask = is_cancel | is_missing_cust | is_bad_date | is_bad_qty | is_bad_price
    df = df[~remove_mask].copy()

    # Replace parsed columns
    df["purchase_date"] = df["_date_parsed"]
    df["quantity"] = df["_qty_parsed"]
    df["unit_price"] = df["_price_parsed"]
    df.drop(columns=["_date_parsed", "_qty_parsed", "_price_parsed"], inplace=True)

    # ── Drop exact duplicates ──
    before_dedup = len(df)
    drop_cols = ["customer_id", "purchase_date", "quantity", "unit_price"]
    extra_dedup = [c for c in ["invoice_no", "stock_code", "description"] if c in df.columns]
    df = df.drop_duplicates(subset=drop_cols + extra_dedup)
    removed_duplicates = before_dedup - len(df)

    # ── Compute TotalPrice ──
    df["total_amount"] = (df["quantity"] * df["unit_price"]).round(2)

    # Ensure optional columns exist
    if "country" not in df.columns:
        df["country"] = "Unknown"
    if "description" not in df.columns:
        df["description"] = "Unknown"
    if "product_name" not in df.columns:
        # Use description as product_name if available
        if "description" in df.columns:
            df["product_name"] = df["description"]
        else:
            df["product_name"] = "Unknown"
    if "invoice_no" not in df.columns:
        # Generate a synthetic invoice identifier for RFM frequency calculation
        df["invoice_no"] = "INV_" + df["purchase_date"].dt.strftime("%Y%m%d") + "_" + df.index.astype(str)

    total_after = len(df)

    if total_after == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid transaction rows after cleaning. "
                   "Check that dates, quantities, and prices are valid.",
        )

    # ── Build internal transaction record format for existing modules ──
    records = df[[
        "customer_id", "invoice_no", "purchase_date", "quantity", "unit_price",
        "total_amount", "country", "product_name"
    ]].copy()
    records["purchase_date"] = records["purchase_date"].dt.strftime("%Y-%m-%d")
    transaction_list = records.to_dict("records")

    # ── RFM ──
    rfm_df = calculate_rfm(transaction_list)

    ref_date = (pd.to_datetime(df["purchase_date"]).max() + pd.Timedelta(days=1)).strftime("%Y-%m-%d")

    # ── Clustering ──
    clustering_result = run_clustering(rfm_df, n_clusters=4)

    # ── Dendrogram ──
    dendro = build_dendrogram(rfm_df)
    dendro_png = generate_dendrogram_image(rfm_df, n_clusters=4)
    dendro_b64 = base64.b64encode(dendro_png).decode("ascii")

    # ── Date range ──
    date_min = pd.to_datetime(df["purchase_date"]).min().strftime("%Y-%m-%d")
    date_max = pd.to_datetime(df["purchase_date"]).max().strftime("%Y-%m-%d")

    # ── Dashboard stats ──
    # ── Dashboard stats ──
    total_revenue = round(float(df["total_amount"].sum()), 2)
    avg_order_value = round(total_revenue / total_after, 2) if total_after else 0

    # Revenue by country
    country_revenue = df.groupby("country")["total_amount"].sum().sort_values(ascending=False)
    revenue_by_country = [
      {"country": c, "revenue": round(float(v), 2)}
      for c, v in country_revenue.items()
    ]

    # Monthly trends
    df["month"] = pd.to_datetime(df["purchase_date"]).dt.to_period("M").astype(str)
    monthly = df.groupby("month").agg(revenue=("total_amount", "sum"), orders=("total_amount", "count"))
    monthly_trends = [
      {"month": m.split("-")[1], "revenue": round(float(row["revenue"]), 2), "orders": int(row["orders"])}
      for m, row in monthly.iterrows()
    ]

    # Revenue distribution (top 5 products)
    product_revenue = df.groupby("product_name")["total_amount"].sum().sort_values(ascending=False)
    COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"]
    revenue_distribution = [
      {"name": name, "value": round(float(v / total_revenue * 100)), "color": COLORS[i]}
      for i, (name, v) in enumerate(product_revenue.head(5).items())
    ]

    # Store in module-level cache so GET endpoints can serve the data
    global _uploaded_cache
    _uploaded_cache = {
        "dataset": transaction_list,
        "total_records": int(total_after),
        "rfm_df": rfm_df,
        "ref_date": ref_date,
        "clustering": clustering_result,
        "dendrogram": dendro,
        "dendrogram_image": dendro_b64,
        "dataset_info": {
            "total_transactions": int(total_after),
            "total_customers": int(len(rfm_df)),
            "date_range": f"{date_min} to {date_max}",
            "rows_removed": int(original_rows - total_after),
            "columns_detected": list(df.columns),
            "countries": sorted(df["country"].dropna().unique().tolist())[:20],
            "total_revenue": total_revenue,
            "avg_order_value": avg_order_value,
        },
        "preprocessing_summary": {
            "original_rows": int(original_rows),
            "removed_canceled": int(removed_canceled),
            "removed_invalid": int(removed_invalid),
            "removed_missing_customer": int(removed_missing_customer),
            "removed_duplicates": int(removed_duplicates),
            "removed_bad_date": int(removed_bad_date),
            "removed_bad_quantity": int(removed_bad_qty),
            "removed_bad_price": int(removed_bad_price),
            "final_transactions": int(total_after),
            "total_customers": int(len(rfm_df)),
        },
        "revenue_by_country": revenue_by_country,
        "monthly_trends": monthly_trends,
        "revenue_distribution": revenue_distribution,
    }

    return {
        "dataset_info": _uploaded_cache["dataset_info"],
        "preprocessing_summary": _uploaded_cache["preprocessing_summary"],
        "revenue_by_country": revenue_by_country,
        "monthly_trends": monthly_trends,
        "revenue_distribution": revenue_distribution,
        "rfm": rfm_df.to_dict("records"),
        "rfm_summary": rfm_summary_stats(rfm_df),
        "reference_date": ref_date,
        "recency_histogram": rfm_histogram(rfm_df, "recency", bins=15),
        "frequency_histogram": rfm_histogram(rfm_df, "frequency", bins=20),
        "monetary_histogram": rfm_histogram(rfm_df, "monetary", bins=20),
        "top_customers": top_customers(rfm_df, n=20),
        "clustering": clustering_result,
        "dendrogram": dendro,
        "dendrogram_image": dendro_b64,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
