import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RootLayout from './components/RootLayout';
import Dashboard from './pages/Dashboard';
import DatasetOverview from './pages/DatasetOverview';
import DatasetUpload from './pages/DatasetUpload';
import DataPreprocessing from './pages/DataPreprocessing';
import RFMAnalysis from './pages/RFMAnalysis';
import Dendrogram from './pages/Dendrogram';
import ClusteringResult from './pages/ClusteringResult';
import Visualization3D from './pages/Visualization3D';
import BusinessInsights from './pages/BusinessInsights';
import ExportReport from './pages/ExportReport';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dataset" element={<DatasetOverview />} />
          <Route path="/upload" element={<DatasetUpload />} />
          <Route path="/preprocessing" element={<DataPreprocessing />} />
          <Route path="/rfm-analysis" element={<RFMAnalysis />} />
          <Route path="/dendrogram" element={<Dendrogram />} />
          <Route path="/clustering" element={<ClusteringResult />} />
          <Route path="/visualization" element={<Visualization3D />} />
          <Route path="/insights" element={<BusinessInsights />} />
          <Route path="/export" element={<ExportReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
