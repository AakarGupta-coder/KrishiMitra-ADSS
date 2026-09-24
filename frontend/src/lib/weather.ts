const WMO: Record<number, [string, string]> = {
  0: ['Clear sky', 'clear_day'],
  1: ['Mainly clear', 'partly_cloudy_day'],
  2: ['Partly cloudy', 'partly_cloudy_day'],
  3: ['Overcast', 'cloud'],
  45: ['Fog', 'foggy'],
  48: ['Rime fog', 'foggy'],
  51: ['Light drizzle', 'rainy_light'],
  53: ['Drizzle', 'rainy_light'],
  55: ['Dense drizzle', 'rainy'],
  56: ['Freezing drizzle', 'weather_mix'],
  57: ['Freezing drizzle', 'weather_mix'],
  61: ['Light rain', 'rainy_light'],
  63: ['Rain', 'rainy'],
  65: ['Heavy rain', 'rainy_heavy'],
  66: ['Freezing rain', 'weather_mix'],
  67: ['Freezing rain', 'weather_mix'],
  71: ['Light snow', 'weather_snowy'],
  73: ['Snow', 'weather_snowy'],
  75: ['Heavy snow', 'weather_snowy'],
  77: ['Snow grains', 'weather_snowy'],
  80: ['Light showers', 'rainy_light'],
  81: ['Showers', 'rainy'],
  82: ['Violent showers', 'rainy_heavy'],
  85: ['Snow showers', 'weather_snowy'],
  86: ['Snow showers', 'weather_snowy'],
  95: ['Thunderstorm', 'thunderstorm'],
  96: ['Thunderstorm, hail', 'thunderstorm'],
  99: ['Thunderstorm, hail', 'thunderstorm'],
};

export const weatherLabel = (code: number | null | undefined) =>
  code === null || code === undefined ? 'Unavailable' : WMO[code]?.[0] ?? `WMO code ${code}`;

export const weatherIcon = (code: number | null | undefined) =>
  code === null || code === undefined ? 'help' : WMO[code]?.[1] ?? 'cloud';

export const isWet = (code: number | null | undefined) => code !== null && code !== undefined && code >= 51;
