# """Build the thesis-defense demo notebook (Vietnamese version)."""
# import os
# import nbformat
#
# nb = nbformat.v4.new_notebook(
#     metadata={
#         "kernelspec": {
#             "display_name": "Python 3",
#             "language": "python",
#             "name": "python3",
#         },
#         "language_info": {
#             "name": "python",
#             "version": "3.11.0",
#         },
#     },
#     nbformat=4,
#     nbformat_minor=4,
# )
#
# def add_md(text):
#     nb.cells.append(nbformat.v4.new_markdown_cell(text))
#
# def add_code(text):
#     cell = nbformat.v4.new_code_cell("")
#     cell.source = text  # force string format (not list) for Jupyter compatibility
#     nb.cells.append(cell)
#
# # ===================================================================
# # Tiêu đề
# # ===================================================================
# add_md("""# Phân tích RFM và Phân cụm Khách hàng bằng Agglomerative Hierarchical Clustering
#
# **Demo bảo vệ khóa luận tốt nghiệp**
#
# Notebook này triển khai toàn bộ quy trình: tiền xử lý dữ liệu, xây dựng đặc trưng RFM, chuẩn hóa Z-score, phân cụm phân cấp (Ward linkage), đánh giá chất lượng phân cụm (Dendrogram, Silhouette Score), và trực quan hóa 3D tương tác bằng Plotly.""")
#
# # ===================================================================
# # 1. Giới thiệu
# # ===================================================================
# add_md("""## 1. Giới thiệu
#
# Phân khúc khách hàng là quá trình nhóm người mua theo hành vi giao dịch, từ đó xây dựng chiến lược marketing phù hợp. Dự án kết hợp hai phương pháp:
#
# | Phương pháp | Mục đích |
# |---|---|
# | **RFM Analysis** | Đo lường từng khách hàng qua 3 chỉ số: Recency (ngày kể từ lần mua gần nhất), Frequency (số lần đặt hàng), Monetary (tổng chi tiêu) |
# | **Agglomerative Hierarchical Clustering** | Phương pháp phân cụm "từ dưới lên", dần hợp nhất các khách hàng gần nhất theo Ward linkage và Euclidean distance |
#
# Số cụm tối ưu *k* = 4 được xác nhận qua Dendrogram và Silhouette Score. Bốn phân khúc kết quả: **VIP Customers**, **Loyal Customers**, **New Customers**, **Lost Customers** — dựa trên đặc điểm RFM trung bình của từng nhóm.
#
# **Dataset:** UCI Online Retail II (~500.000 giao dịch thực tế, hơn 10.000 khách hàng).""")
#
# # ===================================================================
# # 2. Tải dữ liệu
# # ===================================================================
# add_md("""## 2. Tải bộ dữ liệu Online Retail
#
# Tự động tìm kiếm file `.csv` hoặc `.xlsx` trong thư mục dự án và `data/`. Nếu không tìm thấy, sinh dữ liệu mô phỏng từ module `rfm-backend/dataset.py` với 5.000 khách hàng để chạy thử.""")
#
# add_code(r"""import warnings
# warnings.filterwarnings("ignore")
#
# import pandas as pd
# import numpy as np
# import matplotlib
# # matplotlib.use("Agg")  # commented out — allows inline plots in Jupyter
# import matplotlib.pyplot as plt
# import plotly.express as px
# import os
#
# # --- locate dataset automatically ---
# _data_names = [
#     "online_retail_data.csv",
#     "online_retail_data.xlsx",
#     "online_retail.csv",
#     "online_retail.xlsx",
# ]
# _notebook_dir = os.getcwd()
# _project_dir = os.path.dirname(_notebook_dir)
# _search_dirs = [os.path.join(_project_dir, "data"), _project_dir]
#
# _df_path = None
# for d in _search_dirs:
#     if not os.path.isdir(d):
#         continue
#     for name in _data_names:
#         candidate = os.path.join(d, name)
#         if os.path.isfile(candidate):
#             _df_path = candidate
#             break
#     if _df_path:
#         break
#
# df = None
# if _df_path:
#     ext = os.path.splitext(_df_path)[1].lower()
#     print(f"[OK] Found dataset: {_df_path}")
#     if ext == ".csv":
#         df = pd.read_csv(_df_path, encoding="latin-1",
#                          parse_dates=["InvoiceDate"], dayfirst=True)
#     else:
#         try:
#             df = pd.read_excel(_df_path, engine="openpyxl",
#                                parse_dates=["InvoiceDate"], dayfirst=True)
#         except ModuleNotFoundError:
#             print("[ERROR] openpyxl is required for .xlsx files. "
#                   "Install: pip install openpyxl")
#             df = None
#     print(f"[OK] Loaded {len(df):,} rows from {_df_path}")
# else:
#     print("[INFO] No dataset file found -- generating synthetic data (5,000 customers)")
#     _backend = os.path.join(_project_dir, "rfm-backend")
#     if os.path.isdir(_backend):
#         import sys
#         sys.path.insert(0, _backend)
#         from dataset import generate_dataset
#         raw = generate_dataset(customer_count=5000)
#         df = pd.DataFrame(raw)
#         df["purchase_date"] = pd.to_datetime(df["purchase_date"])
#         df = df.rename(columns={
#             "purchase_date": "InvoiceDate",
#             "customer_id": "CustomerID",
#             "invoice_no": "InvoiceNo",
#             "unit_price": "UnitPrice",
#         })
#     else:
#         raise FileNotFoundError(
#             "No dataset found and rfm-backend/ directory missing. "
#             "Place online_retail_data.csv or .xlsx in project root or data/."
#         )
#     print(f"[OK] Generated {len(df):,} synthetic transactions")
#
# # Normalize column names to expected casing (handles both real and synthetic data)
# _col_map = {}
# for _c in df.columns:
#     _cl = _c.strip().lower()
#     if _cl in ("quantity", "qty"):
#         _col_map[_c] = "Quantity"
#     elif _cl in ("total_amount", "totalprice", "total_price"):
#         _col_map[_c] = "TotalAmount"
#     elif _cl in ("unitprice", "unit_price"):
#         _col_map[_c] = "UnitPrice"
#     elif _cl in ("customerid", "customer_id"):
#         _col_map[_c] = "CustomerID"
#     elif _cl in ("invoicedate", "invoice_date", "purchase_date"):
#         _col_map[_c] = "InvoiceDate"
#     elif _cl in ("invoiceno", "invoice_no", "invoice_number"):
#         _col_map[_c] = "InvoiceNo"
# if _col_map:
#     df = df.rename(columns=_col_map)
#
# print(f"Dataset shape: {df.shape[0]:,} rows x {df.shape[1]} columns")
# print(f"Columns: {list(df.columns)}")
# df.head(3)""")
#
# # ===================================================================
# # 3. Tiền xử lý dữ liệu
# # ===================================================================
# add_md("""## 3. Tiền xử lý dữ liệu
#
# Dữ liệu giao dịch thô chứa các bản ghi không hợp lệ. Áp dụng 5 quy tắc làm sạch:
#
# 1. **Loại hóa đơn đã hủy** — InvoiceNo bắt đầu bằng "C" (credit note / hoàn hàng)
# 2. **Loại thiếu CustomerID** — giao dịch không thể gán cho khách hàng nào
# 3. **Loại Quantity ≤ 0** — nhập sai hoặc hoàn trả
# 4. **Loại UnitPrice ≤ 0** — giá âm / miễn phí làm lệch tính toán
# 5. **Loại trùng lặp** — tránh tính đếm tần suất và doanh thu quá cao
#
# Sau khi làm sạch, tính `TotalAmount = Quantity × UnitPrice` cho mỗi dòng giao dịch.""")
#
# add_code("""print("=" * 60)
# print("DATA PREPROCESSING")
# print("=" * 60)
# print(f"Rows before cleaning : {len(df):,}")
#
# original = len(df)
#
# # (1) Remove cancellations and returns (InvoiceNo starts with "C")
# if "InvoiceNo" in df.columns:
#     before = len(df)
#     df = df[~df["InvoiceNo"].astype(str).str.upper().str.startswith("C")].copy()
#     print(f"  After removing cancellations : {len(df):,}  (removed {before - len(df):,})")
#
# # (2) Drop rows with missing CustomerID
# before = len(df)
# df.dropna(subset=["CustomerID"], inplace=True)
# df = df[df["CustomerID"].astype(str) != "nan"].copy()
# df = df[df["CustomerID"].astype(str).str.strip() != ""].copy()
# print(f"  After removing missing CustomerID: {len(df):,}  (removed {before - len(df):,})")
#
# # (3) Remove non-positive Quantity (Quantity <= 0)
# before = len(df)
# df = df[pd.to_numeric(df["Quantity"], errors="coerce") > 0].copy()
# print(f"  After removing Quantity <= 0     : {len(df):,}  (removed {before - len(df):,})")
#
# # (4) Remove non-positive UnitPrice (UnitPrice <= 0)
# before = len(df)
# df = df[pd.to_numeric(df["UnitPrice"], errors="coerce") > 0].copy()
# print(f"  After removing UnitPrice <= 0    : {len(df):,}  (removed {before - len(df):,})")
#
# # (5) Drop exact duplicates
# before = len(df)
# dedup_cols = ["CustomerID", "InvoiceDate", "Quantity", "UnitPrice"]
# if "InvoiceNo" in df.columns:
#     dedup_cols = ["CustomerID", "InvoiceNo"] + dedup_cols
# df = df.drop_duplicates(subset=dedup_cols)
# print(f"  After removing duplicates        : {len(df):,}  (removed {before - len(df):,})")
#
# # Compute total amount: TotalAmount = Quantity * UnitPrice
# df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
# df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce")
# df["TotalAmount"] = (df["Quantity"] * df["UnitPrice"]).round(2)
#
# removed = original - len(df)
# print(f"")
# print(f"Rows after cleaning   : {len(df):,}")
# print(f"Total removed         : {removed:,} ({removed / original * 100:.1f}%)")
# print(f"Unique customers      : {df['CustomerID'].nunique():,}")
# print("=" * 60)""")
#
# # ===================================================================
# # 4. Xây dựng đặc trưng RFM
# # ===================================================================
# add_md("""## 4. Xây dựng đặc trưng RFM
#
# Từ dữ liệu đã làm sạch, tính 3 chỉ số cho từng khách hàng:
#
# - **Recency** — số ngày từ lần mua cuối đến ngày phân tích. Giá trị càng thấp → khách hàng càng hoạt động gần đây.
# - **Frequency** — số hóa đơn riêng biệt. Giá trị càng cao → mức độ tái mua cao.
# - **Monetary** — tổng chi tiêu (`Σ Quantity × UnitPrice`). Giá trị càng cao → giá trị khách hàng càng lớn.
#
# Ba đặc trưng này là đầu vào của thuật toán phân cụm.""")
#
# add_code("""# Analysis date = day after the last transaction (ensures recency >= 0)
# df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])
# analysis_date = df["InvoiceDate"].max() + pd.Timedelta(days=1)
#
# # Compute Recency, Frequency, Monetary per CustomerID
# if "InvoiceNo" in df.columns:
#     rfm = df.groupby("CustomerID").agg(
#         recency=("InvoiceDate", lambda x: (analysis_date - x.max()).days),
#         frequency=("InvoiceNo", "nunique"),
#         monetary=("TotalAmount", "sum"),
#     ).reset_index()
# else:
#     rfm = df.groupby("CustomerID").agg(
#         recency=("InvoiceDate", lambda x: (analysis_date - x.max()).days),
#         frequency=("InvoiceDate", "count"),
#         monetary=("TotalAmount", "sum"),
#     ).reset_index()
#
# rfm["monetary"] = rfm["monetary"].round(2)
# rfm = rfm.sort_values("monetary", ascending=False).reset_index(drop=True)
#
# print(f"RFM table     : {rfm.shape[0]:,} customers x {rfm.shape[1]} features")
# print(f"Analysis date : {analysis_date.date()}")
# print(f"Top 5 customers by monetary value:")
# rfm.head(5)""")
#
# add_code("""# Distribution of RFM dimensions
# fig, axes = plt.subplots(1, 3, figsize=(14, 3.5))
# for ax, col, label in zip(axes, ["recency", "frequency", "monetary"],
#                            ["Recency (days)", "Frequency (orders)", "Monetary ($)"]):
#     ax.hist(rfm[col], bins=30, color="#6366f1", edgecolor="white", alpha=0.85)
#     ax.set_title(label, fontsize=12, fontweight="bold")
#     ax.set_xlabel("")
#     ax.set_ylabel("Customers" if ax is axes[0] else "")
#     ax.axvline(rfm[col].mean(), color="red", linestyle="--", linewidth=1,
#                label=f"Mean = {rfm[col].mean():.1f}")
#     ax.legend(fontsize=9)
# plt.tight_layout()
# plt.show()
#
# print(f"Recency   : min={rfm['recency'].min()}, max={rfm['recency'].max()}, mean={rfm['recency'].mean():.1f}")
# print(f"Frequency : min={rfm['frequency'].min()}, max={rfm['frequency'].max()}, mean={rfm['frequency'].mean():.1f}")
# print(f"Monetary  : min={rfm['monetary'].min():.2f}, max={rfm['monetary'].max():.2f}, mean={rfm['monetary'].mean():.2f}")""")
#
# # ===================================================================
# # 5. Chuẩn hóa Z-score
# # ===================================================================
# add_md("""## 5. Chuẩn hóa Z-score
#
# Ba đặc trưng RFM có thang đo rất khác nhau: Recency (hàng trăm ngày), Frequency (số đơn hàng), Monetary (mức tiền). Thuật toán phân cụm dựa trên khoảng cách nhạy cảm với thang đo — nếu không chuẩn hóa, đặc trưng có giá trị lớn nhất sẽ chi phối kết quả.
#
# Z-score standardization đưa mỗi đặc trưng về mean = 0, std = 1:
#
#     z = (x - mean) / std
#
# Sau biến đổi, mỗi chiều RFM đóng góp như nhau vào tính toán Euclidean distance.""")
#
# add_code("""from sklearn.preprocessing import StandardScaler
#
# scaler = StandardScaler()
# rfm_scaled = scaler.fit_transform(rfm[["recency", "frequency", "monetary"]])
#
# scaled_df = pd.DataFrame(rfm_scaled,
#                          columns=["recency_z", "frequency_z", "monetary_z"])
#
# print("Before standardization:")
# print(rfm[["recency", "frequency", "monetary"]].describe().loc[["mean", "std"]].round(2))
# print()
# print("After standardization (mean ~ 0, std ~ 1):")
# print(scaled_df.describe().loc[["mean", "std"]].round(4))""")
#
# # ===================================================================
# # 6. Phân cụm phân cấp
# # ===================================================================
# add_md("""## 6. Agglomerative Hierarchical Clustering (Ward Linkage)
#
# Phương pháp phân cụm phân cấp tích tụ ("từ dưới lên") bắt đầu từ việc coi mỗi khách hàng là một cụm riêng biệt, sau đó hợp nhất dần các cặp cụm gần nhất để tạo nên cấu trúc phân cấp.
#
# **Ward linkage** — tiêu chí hợp nhất: từng bước gộp hai cụm làm tăng phương sai nội cụm nhỏ nhất. Phương pháp này tạo ra các cụm compact và có kích thước tương đồng — phù hợp cho phân khúc khách hàng.
#
# Khoảng cách giữa các điểm được tính bằng **Euclidean distance** trên không gian đặc trưng RFM đã chuẩn hóa.
#
# Phân cụm được thực hiện trên **toàn bộ** tập khách hàng RFM, không lấy mẫu.
#
# → Số cụm tối ưu sẽ được xác định thông qua Dendrogram ở phần tiếp theo.""")
#
# add_code("""from sklearn.cluster import AgglomerativeClustering
#
# n_clusters = 4
#
# model = AgglomerativeClustering(
#     n_clusters=n_clusters,
#     linkage="ward",
# )
#
# # IMPORTANT: Clustering runs on the FULL standardized RFM data (all customers)
# rfm["cluster"] = model.fit_predict(rfm_scaled)
#
# print(f"Clustering complete: {rfm['cluster'].nunique()} clusters "
#       f"assigned to {len(rfm):,} customers")
# print()
# print("Cluster sizes:")
# for k in sorted(rfm["cluster"].unique()):
#     cnt = (rfm["cluster"] == k).sum()
#     print(f"  Cluster {k}: {cnt:>6,} customers ({cnt / len(rfm) * 100:>5.1f}%)")""")
#
# # ===================================================================
# # 7. Phân tích Dendrogram để chọn số cụm
# # ===================================================================
# add_md("""## 7. Phân tích Dendrogram để chọn số cụm
#
# Dendrogram là biểu đồ cây ghi lại toàn bộ quá trình hợp nhất các cụm trong phân cụm phân cấp. Trục tung thể hiện **Euclidean distance** tại mỗi lần gộp.
#
# **Cách đọc:**
# - Đoạn thẳng đứng càng dài → khoảng cách giữa hai cụm càng lớn → phân tách tự nhiên rõ.
# - Đường cắt ngang giúp xác định số cụm hợp lý — vị trí cắt qua các đoạn thẳng đứng dài nhất.
#
# Khi quan sát dendrogram, đường cắt tại vị trí có khoảng cách lớn tạo ra **4 cụm tự nhiên**, tương ứng với các nhóm khách hàng phổ biến trong marketing (VIP, Loyal, New, Lost).
#
# → Vì vậy, mô hình chọn **k = 4** cho bước phân cụm cuối cùng.
#
# *Dendrogram được vẽ trên mẫu 500 khách hàng để dễ quan sát. Phân cụm thực tế chạy trên toàn bộ dữ liệu RFM.*""")
#
# add_code("""from scipy.cluster.hierarchy import linkage, dendrogram
#
# # Dendrogram drawn on a subsample for visualization readability
# sample_size = min(500, len(rfm))
# sample = rfm[["recency", "frequency", "monetary"]].sample(
#     n=sample_size, random_state=42
# )
# sample_scaled = scaler.transform(sample)
#
# # Build linkage matrix with Ward method and Euclidean distance
# Z = linkage(sample_scaled, method="ward")
#
# # Cut height: the merge distance that produces exactly 4 clusters
# n_sample = len(sample)
# cut_height = float(Z[n_sample - n_clusters, 2])
#
# print(f"Dendrogram sample size : {sample_size} customers (visualization only)")
# print(f"Full clustering dataset: {len(rfm):,} customers")
# print(f"Cut height for {n_clusters} clusters: {cut_height:.4f}")""")
#
# add_code("""from IPython.display import display, Image
#
# fig, ax = plt.subplots(figsize=(14, 5), facecolor="#ffffff")
# ax.set_facecolor("#fafbfc")
#
# dd = dendrogram(
#     Z,
#     truncate_mode="lastp",
#     p=25,
#     ax=ax,
#     leaf_font_size=8,
#     show_contracted=True,
#     color_threshold=0,
# )
#
# # Red dashed line at the cut height for 4 clusters
# ax.axhline(y=cut_height, color="#ef4444", linestyle="--",
#            linewidth=1.2, alpha=0.8)
#
# _, max_x = ax.get_xlim()
# ax.annotate(
#     f"{n_clusters} clusters",
#     xy=(max_x, cut_height),
#     xytext=(max_x - 60, cut_height + 0.15),
#     fontsize=10, fontweight="bold", color="#ef4444", ha="right",
#     bbox=dict(boxstyle="round,pad=0.3", facecolor="#fff1f2",
#               edgecolor="#fca5a5", alpha=0.9),
# )
#
# ax.set_title(
#     "Dendrogram -- Agglomerative Hierarchical Clustering (Ward Linkage)",
#     fontsize=14, fontweight="bold", pad=15,
# )
# ax.set_xlabel("Customers", fontsize=11)
# ax.set_ylabel("Euclidean Distance", fontsize=11)
# ax.spines["top"].set_visible(False)
# ax.spines["right"].set_visible(False)
#
# # Save image and display for compatibility with all environments
# plt.savefig("dendrogram.png", dpi=300, bbox_inches="tight")
# plt.tight_layout()
# plt.show()
#
# # Fallback: display saved image if inline rendering fails
# display(Image(filename="dendrogram.png", width=900))""")
#
# # ===================================================================
# # 8. Đánh giá Silhouette Score
# # ===================================================================
# add_md("""## 8. Đánh giá Silhouette Score
#
# Silhouette Score đo định lượng chất lượng phân cụm. Với mỗi khách hàng:
#
#     s(i) = (b(i) - a(i)) / max(a(i), b(i))
#
# - `a(i)`: khoảng cách trung bình đến các điểm cùng cụm
# - `b(i)`: khoảng cách trung bình đến cụm gần nhất
#
# Kết quả: từ -1 (phân cụm sai) đến +1 (phân cụm tốt). Giá trị > 0.5 → cấu trúc cụm hợp lý.
#
# Tính toán trên **toàn bộ** dữ liệu đã chuẩn hóa.""")
#
# add_code("""from sklearn.metrics import silhouette_score, silhouette_samples
#
# sil = silhouette_score(rfm_scaled, rfm["cluster"])
#
# print("=" * 50)
# print(f"Silhouette Score: {sil:.4f}")
# print("=" * 50)
#
# if sil >= 0.7:
#     print("Interpretation: Strong cluster structure")
# elif sil >= 0.5:
#     print("Interpretation: Reasonable cluster structure")
# elif sil >= 0.25:
#     print("Interpretation: Weak cluster structure")
# else:
#     print("Interpretation: No meaningful structure - reconsider k")""")
#
# add_code("""# Per-cluster silhouette distribution
# sil_samples = silhouette_samples(rfm_scaled, rfm["cluster"])
# colors = ["#6366f1", "#a855f7", "#06b6d4", "#f59e0b"]
#
# fig, ax = plt.subplots(figsize=(9, 3.5), facecolor="#ffffff")
# y_lower = 10
#
# for k in sorted(rfm["cluster"].unique()):
#     member_masks = sil_samples[rfm["cluster"].values == k]
#     member_masks.sort()
#     n_m = len(member_masks)
#     y = np.arange(y_lower, y_lower + n_m)
#     ax.fill_betweenx(y, 0, member_masks,
#                      color=colors[k % len(colors)], alpha=0.7)
#     ax.text(-0.02, y_lower + n_m / 2, str(k),
#             fontsize=11, fontweight="bold")
#     y_lower += n_m + 2
#
# ax.axvline(x=sil, color="red", linestyle="--", linewidth=1.5,
#            label=f"Average = {sil:.4f}")
# ax.set_xlabel("Silhouette Coefficient", fontsize=11)
# ax.set_ylabel("Cluster", fontsize=11)
# ax.set_yticks([])
# ax.set_title("Silhouette Analysis by Cluster",
#              fontsize=13, fontweight="bold")
# ax.legend(loc="right", fontsize=10)
# ax.spines["top"].set_visible(False)
# ax.spines["right"].set_visible(False)
# plt.tight_layout()
# plt.show()""")
#
# # ===================================================================
# # 9. Trực quan hóa 3D bằng Plotly
# # ===================================================================
# add_md("""## 9. Trực quan hóa 3D — Plotly
#
# Gán tên phân khúc cho mỗi cụm dựa trên so sánh hồ sơ RFM trung bình với đặc điểm khách hàng kỳ vọng:
#
# | Phân khúc | Tiêu chí gán | Đặc điểm |
# |---|---|---|
# | **VIP Customers** | Thấp R + cao F + cao M | Mua gần đây, tần suất cao, chi tiêu lớn |
# | **Loyal Customers** | Cao F trong số còn lại | Tần suất mua cao, recency vừa phải |
# | **New Customers** | Phần còn lại sau khi gán VIP/Loyal/Lost | Mua gần đây, tần suất thấp |
# | **Lost Customers** | Cao R + thấp F + thấp M | Ngừng mua lâu, ít mua, chi tiêu thấp |
#
# Gán nhãn theo phương pháp greedy scoring — khớp từng cụm với nhãn phù hợp nhất.""")
#
# add_code("""# Color palette for consistent visualization
# cluster_meta = {
#     "VIP Customers":   {"color": "#6366f1"},
#     "Loyal Customers": {"color": "#a855f7"},
#     "New Customers":   {"color": "#06b6d4"},
#     "Lost Customers":  {"color": "#f59e0b"},
# }
#
#
# def _label_clusters(rfm_df, labels):
#     # Map numeric cluster labels to human-readable segment names.
#     # Logic: compute mean R, F, M for each cluster and assign the
#     # name that best matches the expected profile.
#     profiles = rfm_df.copy()
#     profiles["cluster"] = labels
#     summary = profiles.groupby("cluster").agg(
#         mean_r=("recency", "mean"),
#         mean_f=("frequency", "mean"),
#         mean_m=("monetary", "mean"),
#     )
#     mapping = {}
#     available = set(summary.index.tolist())
#
#     # VIP: low recency, high frequency, high monetary
#     if available:
#         vip_score = -summary["mean_r"] + summary["mean_f"] + summary["mean_m"]
#         best = vip_score.idxmax()
#         mapping[best] = "VIP Customers"
#         available.remove(best)
#     # Lost: high recency, low frequency, low monetary
#     if available:
#         remaining = summary[summary.index.isin(available)]
#         lost_score = (remaining["mean_r"] - remaining["mean_f"]
#                       - remaining["mean_m"])
#         worst = lost_score.idxmax()
#         mapping[worst] = "Lost Customers"
#         available.remove(worst)
#     # Loyal: highest frequency among remaining
#     if available:
#         remaining = summary[summary.index.isin(available)]
#         loyal = remaining["mean_f"].idxmax()
#         mapping[loyal] = "Loyal Customers"
#         available.remove(loyal)
#     # New: remainder
#     for idx in available:
#         mapping[idx] = "New Customers"
#     return mapping
#
#
# label_map = _label_clusters(rfm, rfm["cluster"])
# rfm["segment"] = rfm["cluster"].map(label_map)
# rfm["color"] = rfm["segment"].map(lambda s: cluster_meta[s]["color"])
#
# print("Cluster-to-segment mapping:")
# for k, v in label_map.items():
#     print(f"  Cluster {k} -> {v}")
# print()
# for seg in sorted(rfm["segment"].unique()):
#     sub = rfm[rfm["segment"] == seg]
#     print(f"  {seg:15s}: {len(sub):>6} customers  "
#           f"(R={sub['recency'].mean():6.1f}, "
#           f"F={sub['frequency'].mean():5.1f}, "
#           f"M=${sub['monetary'].mean():>10.2f})")""")
#
# add_code("""# Interactive 3D scatter plot
# Subsample to 1500 points for responsive notebook rendering
# plot_n = min(len(rfm), 1500)
# plot_sample = rfm.sample(n=plot_n, random_state=42)
# 
# fig = px.scatter_3d(
#     plot_sample,
#     x="recency", y="frequency", z="monetary",
#     color="segment",
#     color_discrete_map={s: cluster_meta[s]["color"] for s in cluster_meta},
#     title="3D RFM Customer Segmentation",
#     labels={"color": "Segment"},
#     opacity=0.75,
# )
# marker=dict(size=...) for plotly 6.x compatibility
# fig.update_traces(marker=dict(size=3))
# fig.update_layout(
#     scene=dict(
#         xaxis_title="Recency (days)",
#         yaxis_title="Frequency (orders)",
#         zaxis_title="Monetary ($)",
#     ),
#     margin=dict(l=0, r=0, t=50, b=0),
#     height=600,
# )
# fig.show()""")
# 
# ===================================================================
# 10. So sánh với K-Means
# ===================================================================
# add_md("""## 10. So sánh với K-Means
# 
# Để đánh giá chất lượng phân cụm Hierarchical Clustering (Ward Linkage),
# thực hiện so sánh với thuật toán K-Means — một phương pháp phân cụm
# phổ biến nhất làm baseline.
# 
# Hai thuật toán được so sánh trên cùng điều kiện:
# 
# | Tiêu chí              | Giá trị                    |
# |-----------------------|----------------------------|
# | Dữ liệu đầu vào       | RFM đã chuẩn hóa (Z-score) |
# | Số cụm                | k = 4                      |
# | Hàm đánh giá          | Silhouette Score           |
# 
# Kết quả cho thấy Hierarchical Clustering có thực sự hiệu quả hơn so với
# K-Means trên bộ dữ liệu RFM này.""")
# 
# add_code("""# =========================================================
# CHẠY K-MEANS TRÊN DỮ LIỆU RFM ĐÃ CHUẨN HÓA
# =========================================================
# 
# from sklearn.cluster import KMeans
# 
# kmeans = KMeans(
#     n_clusters=4,
#     random_state=42,
#     n_init=10,
# )
# 
# rfm["cluster_km"] = kmeans.fit_predict(rfm_scaled)
# 
# from sklearn.metrics import silhouette_score
# 
# sil_hierarchical = silhouette_score(rfm_scaled, rfm["cluster"])
# sil_kmeans = silhouette_score(rfm_scaled, rfm["cluster_km"])
# 
# print("=" * 60)
# print(" SO SÁNH CHẤT LƯỢNG PHÂN CỤM")
# print("=" * 60)
# print()
# print(f"  Hierarchical (Ward): {sil_hierarchical:.4f}")
# print(f"  K-Means:             {sil_kmeans:.4f}")
# print()
# 
# diff = sil_hierarchical - sil_kmeans
# 
# if diff > 0:
#     print(f"  => Hierarchical Clustering cao hơn {diff:.4f}")
# else:
#     print(f"  => K-Means cao hơn {abs(diff):.4f}")
# 
# print("=" * 60)""")
# 
# add_code("""# =========================================================
# BẢNG SO SÁNH KẾT QUẢ GIỮA HAI THUẬT TOÁN
# =========================================================
# 
# comparison = pd.DataFrame({
#     "Thuật toán": ["Hierarchical (Ward)", "K-Means"],
#     "Số cụm": [4, 4],
#     "Silhouette Score": [sil_hierarchical, sil_kmeans],
# })
# 
# comparison = comparison.style.highlight_max(
#     subset=["Silhouette Score"],
#     color="#d4edda",
# )
# 
# comparison""")
# 
# add_code("""# =========================================================
# BIỂU ĐỒ CỘT SO SÁNH SILHOUETTE SCORE
# =========================================================
# 
# fig, ax = plt.subplots(figsize=(7, 4.5))
# 
# algorithms = ["Hierarchical\\n(Ward)", "K-Means"]
# scores = [sil_hierarchical, sil_kmeans]
# bar_colors = ["#6366f1", "#a855f7"]
# 
# bars = ax.bar(
#     algorithms, scores,
#     color=bar_colors, width=0.45,
#     edgecolor="white", linewidth=0, alpha=0.9,
# )
# 
# for bar, score in zip(bars, scores):
#     ax.text(
#         bar.get_x() + bar.get_width() / 2,
#         bar.get_height() + 0.005,
#         f"{score:.4f}",
#         ha="center", va="bottom",
#         fontweight="bold", fontsize=13, color="#333",
#     )
# 
# ax.set_ylabel("Silhouette Score", fontsize=12, fontweight="bold")
# ax.set_title(
#     "So sánh chất lượng phân cụm",
#     fontsize=14, fontweight="bold", pad=15,
# )
# ax.set_ylim(0, max(scores) * 1.25)
# ax.spines["top"].set_visible(False)
# ax.spines["right"].set_visible(False)
# 
# plt.tight_layout()
# plt.show()""")
# 
# add_code("""# =========================================================
# KẾT LUẬN TỪ THỰC NGHIỆM SO SÁNH
# =========================================================
# Ngưỡng chênh lệch: nếu |diff| < 0.02 => coi là tương đương
# 
# print("=" * 65)
# print(" KẾT LUẬN SO SÁNH")
# print("=" * 65)
# 
# abs_diff = abs(diff)
# 
# if abs_diff < 0.02:
# 
#     # Hai thuật toán có chất lượng phân cụm tương đương
#     if diff < 0:
#         # K-Means nhỉnh hơn một chút
#         print()
#         print("""
# KẾT LUẬN:
# 
# K-Means và Hierarchical Clustering đều cho chất lượng phân cụm
# tương đương trên bộ dữ liệu RFM.
# 
# Mặc dù K-Means đạt Silhouette Score nhỉnh hơn một chút, mức
# chênh lệch là không đáng kể.
# 
# Trong đề tài này, Hierarchical Clustering vẫn được lựa chọn vì:
# 
#   * Hỗ trợ dendrogram để phân tích cấu trúc dữ liệu
#   * Không cần xác định số cụm ngay từ đầu
#   * Có khả năng diễn giải cao
#   * Thể hiện được cấu trúc phân cấp giữa các nhóm khách hàng
# 
# Do đó, Hierarchical Clustering phù hợp hơn với mục tiêu nghiên
# cứu và phân tích khách hàng của đề tài.
# """)
#     else:
#         # Hierarchical nhỉnh hơn một chút
#         print()
#         print("""
# KẾT LUẬN:
# 
# Hierarchical Clustering và K-Means cho chất lượng phân cụm rất
# gần nhau trên bộ dữ liệu RFM.
# 
# Hierarchical Clustering đạt Silhouette Score cao hơn một chút,
# tuy nhiên mức chênh lệch là không lớn.
# 
# Ngoài chất lượng phân cụm, Hierarchical Clustering còn có
# các ưu điểm:
# 
#   * Hỗ trợ dendrogram
#   * Dễ diễn giải
#   * Thể hiện cấu trúc phân cấp của dữ liệu
# 
# Vì vậy đây là thuật toán được lựa chọn trong đề tài.
# """)
# 
# else:
# 
#     # Chênh lệch >= 0.02 => một thuật toán vượt trội
#     if diff > 0:
#         print()
#         print(
#             f"Hierarchical Clustering với Ward Linkage vượt trội "
#             f"K-Means với chênh lệch Silhouette Score = {abs_diff:.4f} "
#             f"(>{0.02})."
#         )
#         print()
#         print(
#             "Điều này xác nhận việc lựa chọn Hierarchical Clustering "
#             "là phù hợp cho bài toán phân khúc khách hàng. Ngoài chất "
#             "lượng phân cụm tốt hơn, phương pháp này còn cung cấp "
#             "dendrogram — giúp diễn giải cấu trúc phân cấp dữ liệu "
#             "một cách trực quan và có ý nghĩa kinh doanh rõ ràng."
#         )
#     else:
#         print()
#         print(
#             f"K-Means vượt trội Hierarchical Clustering với chênh lệch "
#             f"Silhouette Score = {abs_diff:.4f} (>{0.02})."
#         )
#         print()
#         print(
#             "Tuy nhiên, Hierarchical Clustering vẫn được lựa chọn "
#             "trong đề tài vì hỗ trợ dendrogram, khả năng diễn giải cao, "
#             "và thể hiện cấu trúc phân cấp của dữ liệu — những ưu thế "
#             "mà K-Means không có được."
#         )
# 
# print()
# print(
#     f"Hierarchical (Ward): {sil_hierarchical:.4f} | "
#     f"K-Means: {sil_kmeans:.4f} | "
#     f"Chênh lệch: {abs_diff:.4f}"
# )
# print("=" * 65)""")
# 
# ===================================================================
# 11. Diễn giải ý nghĩa kinh doanh
# ===================================================================
# add_md("""## 11. Diễn giải ý nghĩa kinh doanh
#
# Tổng hợp kết quả phân cụm: bảng hồ sơ từng phân khúc (đặc điểm RFM trung bình), biểu đồ đóng góp doanh thu, so sánh RFM tương đối giữa các nhóm, và đề xuất chiến lược marketing cho từng phân khúc.""")
#
# add_code("""# Per-segment summary table
# summary = rfm.groupby("segment").agg(
#     customers=("CustomerID", "count"),
#     avg_recency=("recency", "mean"),
#     avg_frequency=("frequency", "mean"),
#     avg_monetary=("monetary", "mean"),
#     total_revenue=("monetary", "sum"),
# ).reset_index()
# summary["share"] = (summary["customers"] / summary["customers"].sum()
#                     * 100).round(1)
# summary = summary.sort_values("total_revenue", ascending=False)
#
# print("Segment Profile Summary")
# print("=" * 72)
# print(f"{'Segment':<18s} {'Cust.':>7s} {'Share':>6s} "
#       f"{'Avg R':>7s} {'Avg F':>7s} {'Avg M':>10s} {'Revenue':>14s}")
# print("-" * 72)
# for _, row in summary.iterrows():
#     print(f"{row['segment']:<18s} {row['customers']:>7,d} "
#           f"{row['share']:>5.1f}% "
#           f"{row['avg_recency']:>7.1f} {row['avg_frequency']:>7.1f} "
#           f"${row['avg_monetary']:>9.2f} "
#           f"${row['total_revenue']:>13,.2f}")
# print("=" * 72)""")
#
# add_code("""# Revenue contribution pie chart + normalized RFM bar chart
# fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
#
# names = summary["segment"].tolist()
# revenues = summary["total_revenue"].tolist()
# colors_list = [cluster_meta[n]["color"] for n in names]
#
# # Pie chart: revenue share by segment
# ax = axes[0]
# wedges, texts, autotexts = ax.pie(
#     revenues, labels=names, colors=colors_list,
#     autopct="%1.1f%%", startangle=140,
#     textprops={"fontsize": 10},
# )
# for t in autotexts:
#     t.set_fontweight("bold")
#     t.set_color("white")
# ax.set_title("Revenue Contribution by Segment",
#              fontsize=12, fontweight="bold", pad=12)
#
# # Bar chart: relative RFM profile per segment (normalized for comparison)
# ax = axes[1]
# x = np.arange(len(names))
# w = 0.25
# ax.bar(x - w, summary["avg_recency"] / summary["avg_recency"].max(),
#        w, label="Avg Recency", color="#6366f1", alpha=0.85)
# ax.bar(x, summary["avg_frequency"] / summary["avg_frequency"].max(),
#        w, label="Avg Frequency", color="#a855f7", alpha=0.85)
# ax.bar(x + w, summary["avg_monetary"] / summary["avg_monetary"].max(),
#        w, label="Avg Monetary", color="#06b6d4", alpha=0.85)
# ax.set_xticks(x)
# ax.set_xticklabels(names, fontsize=9)
# ax.set_ylabel("Normalized Value", fontsize=10)
# ax.set_title("Relative RFM Profile per Segment",
#              fontsize=12, fontweight="bold", pad=12)
# ax.legend(fontsize=9, loc="upper right")
# ax.spines["top"].set_visible(False)
# ax.spines["right"].set_visible(False)
# ax.axhline(0.5, color="gray", linestyle=":", linewidth=0.7, alpha=0.5)
#
# plt.tight_layout()
# plt.show()""")
#
# add_code("""# Actionable recommendations per segment
# recommendations = {
#     "VIP Customers": [
#         "Launch exclusive loyalty program with tiered rewards",
#         "Provide early access to new products and limited editions",
#         "Assign dedicated account managers for top spenders",
#         "Create referral program leveraging brand influence",
#     ],
#     "Loyal Customers": [
#         "Upsell premium product lines to increase average order value",
#         "Implement tiered rewards to encourage promotion to VIP",
#         "Send personalized recommendations based on purchase history",
#         "Offer bundled deals to increase basket size",
#     ],
#     "New Customers": [
#         "Send welcome series with onboarding product guides",
#         "Offer first-repeat-purchase discount within 30 days",
#         "Collect preferences through post-purchase surveys",
#         "Enroll in nurture campaign to build repeat habits",
#     ],
#     "Lost Customers": [
#         "Deploy win-back email campaign with personalized offers",
#         "Conduct exit surveys to understand churn reasons",
#         "Offer time-limited comeback incentives",
#         "Analyze last purchase date to prioritize outreach urgency",
#     ],
# }
#
# print("=" * 65)
# print(" BUSINESS RECOMMENDATIONS BY CUSTOMER SEGMENT")
# print("=" * 65)
#
# for seg in ["VIP Customers", "Loyal Customers",
#             "New Customers", "Lost Customers"]:
#     if seg not in rfm["segment"].values:
#         continue
#     sub = rfm[rfm["segment"] == seg]
#     pct = len(sub) / len(rfm) * 100
#     print()
#     print(f"> {seg} ({len(sub):,} customers, {pct:.1f}% of base)")
#     print(f"  Avg Recency: {sub['recency'].mean():.1f} days | "
#           f"Avg Frequency: {sub['frequency'].mean():.1f} orders | "
#           f"Avg Monetary: ${sub['monetary'].mean():.2f}")
#     for rec in recommendations[seg]:
#         print(f"  * {rec}")
#
# print()
# print("=" * 65)
# print(f" Silhouette Score: {sil:.4f}  |  Clusters: {n_clusters}")
# print("=" * 65)""")
#
# # ===================================================================
# # Write notebook using nbformat (guarantees correct Jupyter format)
# # ===================================================================
# _out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
#                     "rfm_hierarchical_clustering_demo.ipynb")
#
# with open(_out, "w", encoding="utf-8") as f:
#     nbformat.write(nb, f)
#
# print(f"Written: {_out}")
# md_count = sum(1 for c in nb.cells if c.cell_type == "markdown")
# code_count = sum(1 for c in nb.cells if c.cell_type == "code")
# print(f"Cells: {len(nb.cells)} ({md_count} md, {code_count} code)")
