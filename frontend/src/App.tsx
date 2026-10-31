import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { DEFAULT_LOCATION_PRESET_ID, LOCATION_PRESETS } from './lib/presets';
import Dashboard from './pages/Dashboard';
import { useFarmStore } from './store/useFarmStore';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import LocationPicker from './components/LocationPicker';
import { useChooseLocation } from './hooks/useChooseLocation';

// Dashboard is the landing page; the rest load on first visit to keep the initial bundle small.
const FarmProfilePage = lazy(() => import('./pages/FarmProfilePage'));
const CropAdvisorPage = lazy(() => import('./pages/CropAdvisorPage'));
const YieldPredictionPage = lazy(() => import('./pages/YieldPredictionPage'));
const IrrigationAdvisorPage = lazy(() => import('./pages/IrrigationAdvisorPage'));
const WeatherIntelligencePage = lazy(() => import('./pages/WeatherIntelligencePage'));
const SoilIntelligencePage = lazy(() => import('./pages/SoilIntelligencePage'));
const AIInsightsPage = lazy(() => import('./pages/AIInsightsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

const PageLoading = () => (
  <div className="flex items-center justify-center gap-2 py-24 text-body-md text-on-surface-variant">
    <span className="material-symbols-outlined animate-spin text-forest">progress_activity</span>
    Loading…
  </div>
);

const FirstRunSetup = () => {
  const deviceAttempted = useFarmStore((s) => s.deviceAttempted);
  const setDeviceAttempted = useFarmStore((s) => s.setDeviceAttempted);
  const { locateDevice, pickPreset } = useChooseLocation();
  const [phase, setPhase] = useState<'detecting' | 'choose'>(deviceAttempted ? 'choose' : 'detecting');
  const [reason, setReason] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (deviceAttempted || started.current) return;
    started.current = true;
    setDeviceAttempted();
    locateDevice((msg) => {
      setReason(msg);
      const fallback = LOCATION_PRESETS.find((p) => p.id === DEFAULT_LOCATION_PRESET_ID);
      if (fallback) pickPreset(fallback, 'default');
      else setPhase('choose');
    }, { onlyIfEmpty: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-hairline rounded-xl shadow-[0_20px_48px_-8px_rgba(17,66,50,0.16)] overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-hairline flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-headline-md font-headline-md text-forest">Set up your farm location</h1>
            <p className="text-body-md text-on-surface-variant">
              {phase === 'detecting'
                ? 'Detecting this device’s location. You can choose a location manually instead.'
                : 'KRISHIMITRA fetches weather, soil, climate and market data for these exact coordinates.'}
            </p>
            {reason && <p className="text-body-sm text-[#B45309] mt-1">{reason}</p>}
          </div>
        </div>
        {phase === 'detecting' ? (
          <div className="p-6 flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-forest">progress_activity</span>
              Waiting for location permission…
            </span>
            <button className="text-body-md font-semibold text-forest hover:underline" onClick={() => setPhase('choose')}>Choose manually</button>
          </div>
        ) : (
          <LocationPicker />
        )}
      </div>
    </div>
  );
};

const AppContent = () => {
  const selectedFarm = useFarmStore((s) => s.selectedFarm);
  if (!selectedFarm) return <FirstRunSetup />;
  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/farm-profile" element={<FarmProfilePage />} />
        <Route path="/crop-advisor" element={<CropAdvisorPage />} />
        <Route path="/yield-prediction" element={<YieldPredictionPage />} />
        <Route path="/irrigation-advisor" element={<IrrigationAdvisorPage />} />
        <Route path="/weather-intelligence" element={<WeatherIntelligencePage />} />
        <Route path="/soil-intelligence" element={<SoilIntelligencePage />} />
        <Route path="/ai-insights" element={<AIInsightsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </Layout>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
