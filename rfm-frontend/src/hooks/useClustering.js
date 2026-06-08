import { useState, useEffect } from 'react';
import { fetchClustering, fetchDendrogram, fetchDendrogramImage } from '../utils/api';
import { useAnalytics } from '../contexts/AnalyticsContext';

export default function useClustering() {
  const { uploadedData } = useAnalytics();
  const [clustering, setClustering] = useState(null);
  const [dendrogram, setDendrogram] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (uploadedData) {
      setClustering(uploadedData.clustering);
      setDendrogram(uploadedData.dendrogram);
      const img = uploadedData.dendrogram_image;
      setImageSrc(img ? `data:image/png;base64,${img}` : null);
      setHasData(true);
      setLoading(false);
      setError(null);
      return;
    }

    setClustering(null);
    setDendrogram(null);
    setImageSrc(null);
    setHasData(false);
    setLoading(false);
    setError(null);
  }, [uploadedData]);

  return { clustering, dendrogram, imageSrc, loading, error, hasData };
}
