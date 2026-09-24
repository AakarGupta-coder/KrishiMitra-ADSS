
export type Severity = 'info' | 'caution' | 'warning' | 'critical';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'unavailable';

export interface DailyForecast {
  date: string;
  weather_code: number | null;
  tmax: number | null;
  tmin: number | null;
  precip: number | null;
  precip_prob: number | null;
  et0: number | null;
  rh_mean: number | null;
  wind_max: number | null;
}

export interface WeatherBundle {
  status: 'ok' | 'unavailable';
  source: string;
  fetched_at: number | null;
  timezone?: string;
  grid?: { lat: number; lon: number; elevation: number };
  current: {
    time: string;
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    wind_speed: number | null;
    weather_code: number | null;
  } | null;
  daily: DailyForecast[];
  soil_moisture: { value: number; time: string; depth: string; unit: string } | null;
  error?: string;
}

export interface Climatology {
  status: 'ok' | 'unavailable';
  source: string;
  period: string | null;
  fetched_at: number | null;
  monthly: { month: number; t2m: number | null; rh2m: number | null; precip_mm: number | null; solar_mj_m2_day: number | null; n_years: number }[];
  error?: string;
}

export interface SoilInterpretation {
  texture: string | null;
  ph_class: { label: string; tone: 'ok' | 'caution' | 'critical' } | null;
  organic_carbon_pct: number | null;
  constraints: { severity: string; text: string }[];
  implications: string[];
  amendments: string[];
}

export interface Soil {
  status: 'ok' | 'fallback' | 'unavailable' | 'pending';
  requested_lat: number;
  requested_lon: number;
  resolved_lat: number | null;
  resolved_lon: number | null;
  distance_km: number | null;
  fallback_used: boolean;
  fallback_reason: string | null;
  fallback_region?: string;
  depth: string;
  units?: Record<string, string>;
  fetched_at: number | null;
  source: string;
  error: string | null;
  nitrogen: number | null;
  phh2o: number | null;
  sand: number | null;
  silt: number | null;
  clay: number | null;
  soc: number | null;
  cec: number | null;
  result_code?: 'SUCCESS' | 'FALLBACK' | 'NO_SOIL_DATA' | 'UNAVAILABLE';
  layer?: string;
  source_type?: 'MODELLED_GRID';
  dataset_version?: string;
  resolution?: string;
  data_quality?: 'REGIONAL_ESTIMATE' | null;
  hwsd_smu_id?: number | null;
  soil_unit?: string | null;
  component_share?: number | null;
  texture_class?: string | null;
  texture_class_hwsd?: string | null;
  bulk_density?: number | null;
  available_water_capacity?: number | null;
  awc_mm_per_m?: number | null;
  rooting_depth?: string | null;
  drainage?: string | null;
  provenance?: Record<string, string | number | null>;
  measured?: { sourceType: 'FARM_MEASURED'; source: string; values: Record<string, number> } | null;
  interpretation: SoilInterpretation;
}

export interface Market {
  commodity: string | null;
  source: string;
  status: 'live' | 'stale' | 'unavailable';
  basis: 'local_district' | 'nearest_in_state' | 'nearest_national' | 'state_median' | 'national_median' | 'last_observed' | null;
  unit: string;
  currency: string;
  market?: string;
  district?: string;
  state?: string;
  variety?: string;
  arrival_date?: string;
  modal_price?: number;
  min_price?: number | null;
  max_price?: number | null;
  price_per_kg?: number;
  distance_km?: number | null;
  markets_considered?: number;
  pool_min?: number;
  pool_max?: number;
  previous?: { arrival_date: string; modal_price: number } | null;
  fetched_at?: number | null;
  reason?: string;
  sample_key_limited?: boolean;
}

export interface Constraint { severity: 'info' | 'caution' | 'critical'; text: string }

export interface Attribution {
  factor: string;
  label: string;
  value: number | null;
  min?: number;
  max?: number;
  unit?: string;
  source?: string;
  multiplier: number;
  status: 'in_range' | 'low' | 'high' | 'met_by_irrigation' | 'off_season';
}

export interface Sowing {
  in_season: boolean | null;
  status: 'open' | 'upcoming' | 'off_season' | 'unknown';
  window_label: string | null;
  window_start?: string;
  window_end?: string;
  days_to_open?: number;
  seasons?: string[];
  growing_months?: number[];
}

export interface YieldEstimate {
  value_t_ha: number | null;
  method: 'ml' | 'reference' | 'unavailable';
  method_label: string;
  reference_t_ha?: number;
  low_t_ha: number | null;
  high_t_ha: number | null;
  range_basis: string | null;
  reliability: string | null;
  note: string;
  features_used?: Record<string, unknown>;
  shap?: { base_t_ha: number; contributions: { feature: string; value: number; shap_t_ha: number }[] } | null;
}

export interface Financials {
  yield_t_ha: number | null;
  production_t: number | null;
  price_per_t: number | null;
  price_per_kg: number | null;
  price_basis: 'live' | 'last_observed' | 'reference' | 'unavailable';
  gross_revenue: number | null;
  cost_total: number | null;
  cost_per_ha: number | null;
  cost_basis: string | null;
  cost_components: Record<string, number | null>;
  net_return: number | null;
  net_per_ha: number | null;
}

export interface CropResult {
  crop: string;
  agronomic_score: number;
  rank: number;
  eligible: boolean;
  scorable: boolean;
  ineligible_reasons: string[];
  positives: string[];
  constraints: Constraint[];
  attribution: Attribution[];
  excluded_factors: string[];
  coverage: number;
  confidence: 'High' | 'Medium' | 'Low';
  sowing: Sowing;
  features: Record<string, number>;
  feature_sources: Record<string, string>;
  yield: YieldEstimate;
  market: Market;
  financials: Financials;
  economic: { confidence: 'Medium' | 'Low' | 'Unavailable'; observed_price: boolean; basis: string };
  profile: {
    duration_months: number | null;
    seasons: string[];
    water_requirement_mm: [number, number];
    weather_compatibility: Compatibility;
    soil_compatibility: Compatibility;
  };
}

export interface Compatibility { status: 'compatible' | 'partial' | 'incompatible' | 'not_evaluated'; in_range: number; evaluated: number }

export interface IrrigationDay {
  date: string;
  rain: number | null;
  effective_rain: number;
  et0: number;
  etc: number;
  balance: number;
  depletion: number;
  irrigation_gross: number;
  irrigation_net: number;
}

export interface Irrigation {
  status: 'irrigate_now' | 'irrigate_soon' | 'scheduled' | 'not_needed' | 'unavailable';
  reason?: string;
  crop: string | null;
  kc: number;
  kc_basis: string;
  irrigation_type: string;
  efficiency: number | null;
  taw_mm: number;
  raw_mm: number;
  initial_depletion_mm: number;
  totals: { rain: number; eff_rain: number; et0: number; etc: number; net_irrigation: number; gross_irrigation: number };
  deficit_mm: number;
  next_irrigation: { date: string; net_mm: number; gross_mm: number } | null;
  volume_m3: number;
  horizon_days: number;
  days: IrrigationDay[];
  assumptions: string[];
}

export interface RiskCategory {
  id: string;
  label: string;
  level: RiskLevel;
  evidence: string[];
  why: string;
  watch: string | null;
  action: string | null;
  data_used: string[];
  module: string;
  when: string | null;
  confidence: string | null;
}

export interface RiskTimelineDay { date: string; flags: { type: string; label: string; severity: 'info' | 'caution' | 'critical' }[] }

export interface SourceSnapshot {
  status: string;
  fetched_at?: number | null;
  error?: string | null;
  [k: string]: unknown;
}

export interface FarmSummary {
  _meta: { version: string; generated_at: string; build_ms: number; rules_version: string; min_agronomic: number };
  request: { lat: number; lon: number; area: number; irrigation_type: string; current_crop: string | null; soil_test: Record<string, number>; overrides: Record<string, number> };
  location: { lat: number; lon: number; timezone: string | null; place: string | null; district: string | null; state: string | null; country: string | null; country_code: string | null; display_name: string | null; status: string };
  season: { current: string; current_label: string; planning: string; planning_label: string; date: string };
  weather: WeatherBundle;
  climate: Climatology;
  soil: Soil;
  crops: CropResult[];
  recommendation: { canonical: string | null; top_agronomic: string | null; top_economic: string | null; explanation: string[] };
  irrigation: Irrigation;
  risk: { overall: RiskLevel; categories: RiskCategory[]; timeline: RiskTimelineDay[]; available: number; total: number };
  sources: Record<string, SourceSnapshot>;
  provider_status?: Record<string, { status: SourceEntry['status']; kind: 'remote' | 'local'; last_attempt: number | null; last_success: number | null; last_error: string | null }>;
}

export interface YieldDetail {
  crop: string;
  estimate: YieldEstimate;
  production_t: number | null;
  agronomic: Pick<CropResult, 'agronomic_score' | 'confidence' | 'coverage' | 'positives' | 'constraints' | 'attribution' | 'excluded_factors' | 'sowing'>;
  features: Record<string, number>;
  feature_sources: Record<string, string>;
  financials: Financials;
  historical: { status: string; source?: string; series: { year: number; yield_t_ha: number; area_ha: number; placeholder_like: boolean }[]; placeholder_rows?: number; reason?: string };
  model: { available: boolean; name?: string; version?: string; supported_crops?: string[]; mae_t_ha?: number; r2?: number; reliability?: string; features?: string[] };
  sensitivity: { suitability: number; yield_t_ha: number }[] | null;
}

export interface SourceEntry {
  id: string;
  name: string;
  kind: 'remote' | 'local';
  category: string;
  purpose: string;
  resolution?: string;
  coverage?: string | null;
  variables?: string[];
  features?: string[];
  dataset?: string | null;
  notes?: string[];
  cache_ttl?: string;
  url?: string;
  used_by: string[];
  rule_version?: string;
  rule_updated?: string;
  file?: { path: string; modified: string | null };
  status: 'connected' | 'degraded' | 'unavailable' | 'not_queried' | 'available';
  last_attempt: number | null;
  last_success: number | null;
  last_error: string | null;
}
