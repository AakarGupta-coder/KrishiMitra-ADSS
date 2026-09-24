export const REPORT_SECTIONS = [
  { id: 'profile', label: 'Farm profile & location' },
  { id: 'weather', label: 'Weather' },
  { id: 'soil', label: 'Soil' },
  { id: 'crop', label: 'Crop recommendation' },
  { id: 'yield', label: 'Yield prediction' },
  { id: 'irrigation', label: 'Irrigation' },
  { id: 'financial', label: 'Financial analysis' },
  { id: 'risk', label: 'Risks' },
  { id: 'actions', label: 'Recommendations' },
  { id: 'sources', label: 'Data sources' },
] as const;
export type SectionId = (typeof REPORT_SECTIONS)[number]['id'];
