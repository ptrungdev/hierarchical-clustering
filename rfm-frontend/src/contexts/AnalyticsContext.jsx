import { createContext, useContext, useState } from 'react';

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const [uploadedData, setUploadedData] = useState(null);

  return (
    <AnalyticsContext.Provider value={{ uploadedData, setUploadedData }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
