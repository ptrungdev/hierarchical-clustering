"""Quick test for clustering module."""
from dataset import generate_dataset
from rfm import calculate_rfm
from clustering import run_clustering, build_dendrogram

dataset = generate_dataset(5000)
rfm = calculate_rfm(dataset)

print("RFM shape:", rfm.shape)

result = run_clustering(rfm)
print("Clustering results:")
print("  Silhouette:", result["silhouette"])
print("  Clusters:", len(result["clusters"]))
for c in result["clusters"]:
    print(f'  {c["name"]}: size={c["size"]}, avg_r={c["avg_recency"]}, avg_f={c["avg_frequency"]}, avg_m={c["avg_monetary"]}')
print("  Labels:", len(result["labels"]))

dend = build_dendrogram(rfm)
print("Dendrogram:")
print("  n_obs:", dend["n_obs"])
print("  icoord count:", len(dend["icoord"]))
print("  dcoord count:", len(dend["dcoord"]))
print("  leaves count:", len(dend["leaves"]))