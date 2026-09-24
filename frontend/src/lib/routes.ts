export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export const MODULES: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { icon: 'psychology', label: 'Crop Advisor', path: '/crop-advisor' },
  { icon: 'trending_up', label: 'Yield Prediction', path: '/yield-prediction' },
  { icon: 'water_drop', label: 'Irrigation Advisor', path: '/irrigation-advisor' },
  { icon: 'partly_cloudy_day', label: 'Weather Intelligence', path: '/weather-intelligence' },
  { icon: 'science', label: 'Soil Intelligence', path: '/soil-intelligence' },
  { icon: 'model_training', label: 'AI Insights & Risk', path: '/ai-insights' },
  { icon: 'agriculture', label: 'Farm Profile', path: '/farm-profile' },
];

export const UTILITIES: NavItem[] = [
  { icon: 'summarize', label: 'Reports', path: '/reports' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

export const routeTitle = (pathname: string) =>
  [...MODULES, ...UTILITIES].find((m) => pathname.startsWith(m.path))?.label ?? 'KRISHIMITRA';
