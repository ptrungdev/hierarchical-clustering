import { useState, useEffect, useCallback } from 'react';
import { fetchRfm } from '../utils/api';
import { useAnalytics } from '../contexts/AnalyticsContext';

export default function useRfm() {
  const { uploadedData } = useAnalytics();
  const [rfm, setRfm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (uploadedData) {
      setRfm({
        rfm: uploadedData.rfm,
        summary: uploadedData.rfm_summary,
        recency_histogram: uploadedData.recency_histogram,
        frequency_histogram: uploadedData.frequency_histogram,
        monetary_histogram: uploadedData.monetary_histogram,
        top_customers: uploadedData.top_customers,
        total_customers: uploadedData.dataset_info.total_customers,
        reference_date: uploadedData.reference_date,
      });
      setHasData(true);
      setLoading(false);
      setError(null);
      return;
    }

    setRfm(null);
    setHasData(false);
    setLoading(false);
    setError(null);
  }, [uploadedData]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRfm()
      .then((res) => {
        setRfm(res);
        setHasData(true);
      })
      .catch((err) => {
        setError(err.response ? err.response.data?.detail || 'API error' : err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { rfm, loading, error, hasData, refresh };
}
