import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8001',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchDataset() {
  const { data } = await api.get('/api/dataset');
  return data;
}

export async function fetchRfm() {
  const { data } = await api.get('/api/rfm');
  return data;
}

export async function fetchClustering() {
  const { data } = await api.get('/api/clustering');
  return data;
}

export async function fetchDendrogram() {
  const { data } = await api.get('/api/dendrogram');
  return data;
}

export async function fetchDendrogramImage() {
  const { data } = await api.get('/api/dendrogram-image', { responseType: 'blob' });
  return URL.createObjectURL(data);
}

export async function exportCsv() {
  const { data, headers } = await api.get('/api/export/csv', { responseType: 'blob' });
  return { blob: data, filename: 'rfm_scores.csv', contentType: headers['content-type'] };
}

export async function exportExcel() {
  const { data, headers } = await api.get('/api/export/excel', { responseType: 'blob' });
  return { blob: data, filename: 'clustering_report.xlsx', contentType: headers['content-type'] };
}

export async function exportPdf() {
  const { data, headers } = await api.get('/api/export/pdf', { responseType: 'blob' });
  return { blob: data, filename: 'dashboard_report.pdf', contentType: headers['content-type'] };
}

export async function uploadDataset(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/api/upload-dataset', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    onUploadProgress: onProgress,
  });
  return data;
}

export default api;
