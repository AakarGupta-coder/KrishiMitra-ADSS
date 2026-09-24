export interface LocationPreset {
  id: string;
  name: string;
  district: string;
  region: string;
  lat: number;
  lon: number;
  area: number;
  context: string;
}

export const PRESET_DEFAULT_AREA_HA = 1.0;

export const LOCATION_PRESETS: LocationPreset[] = [
  { id: 'tiruppur', name: 'Tiruppur', district: 'Tiruppur', region: 'Tamil Nadu', lat: 11.1085, lon: 77.3411, area: PRESET_DEFAULT_AREA_HA, context: 'Western Tamil Nadu: cotton, coconut and vegetables' },
  { id: 'coimbatore', name: 'Coimbatore', district: 'Coimbatore', region: 'Tamil Nadu', lat: 11.0168, lon: 76.9558, area: PRESET_DEFAULT_AREA_HA, context: 'Kongu region: coconut, maize and vegetables' },
  { id: 'nashik', name: 'Nashik', district: 'Nashik', region: 'Maharashtra', lat: 20.0, lon: 73.78, area: PRESET_DEFAULT_AREA_HA, context: 'Onion and grape belt' },
  { id: 'pune', name: 'Pune', district: 'Pune', region: 'Maharashtra', lat: 18.5204, lon: 73.8567, area: PRESET_DEFAULT_AREA_HA, context: 'Western Maharashtra: sugarcane and vegetables' },
  { id: 'ludhiana', name: 'Ludhiana', district: 'Ludhiana', region: 'Punjab', lat: 30.901, lon: 75.8573, area: PRESET_DEFAULT_AREA_HA, context: 'Indo-Gangetic plain: rice–wheat system' },
  { id: 'bengaluru', name: 'Bengaluru', district: 'Bengaluru Urban', region: 'Karnataka', lat: 12.9716, lon: 77.5946, area: PRESET_DEFAULT_AREA_HA, context: 'Eastern dry zone: ragi and vegetables' },
  { id: 'chennai', name: 'Chennai', district: 'Chennai', region: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, area: PRESET_DEFAULT_AREA_HA, context: 'Coastal Tamil Nadu: paddy and groundnut hinterland' },
  { id: 'nagpur', name: 'Nagpur', district: 'Nagpur', region: 'Maharashtra', lat: 21.1458, lon: 79.0882, area: PRESET_DEFAULT_AREA_HA, context: 'Vidarbha: cotton, soybean and orange' },
  { id: 'amritsar', name: 'Amritsar', district: 'Amritsar', region: 'Punjab', lat: 31.634, lon: 74.8723, area: PRESET_DEFAULT_AREA_HA, context: 'Majha: rice–wheat system' },
  { id: 'lucknow', name: 'Lucknow', district: 'Lucknow', region: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462, area: PRESET_DEFAULT_AREA_HA, context: 'Central Indo-Gangetic plain: wheat, rice and sugarcane' },
  { id: 'hyderabad', name: 'Hyderabad', district: 'Hyderabad', region: 'Telangana', lat: 17.385, lon: 78.4867, area: PRESET_DEFAULT_AREA_HA, context: 'Deccan plateau: paddy, cotton and maize' },
];

export const CURRENT_CROP_OPTIONS = [
  'Wheat', 'Rice', 'Maize', 'Sorghum', 'Pearl Millet', 'Barley', 'Green Gram', 'Black Gram', 'Chickpea',
  'Soybean', 'Groundnut', 'Cotton', 'Sugarcane', 'Tomato', 'Potato', 'Onion', 'Turmeric', 'Ginger',
];

export const IRRIGATION_TYPES = ['Rainfed', 'Drip', 'Sprinkler', 'Flood/Surface'] as const;

export const DEFAULT_LOCATION_PRESET_ID = 'nagpur';
