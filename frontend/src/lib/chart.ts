export const CHART = {
  rain: '#0284C7',
  heat: '#D97706',
  green: '#16A34A',
  forest: '#114232',
  grid: '#E2E8DE',
  axis: '#414944',
  muted: '#717974',
};

export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: CHART.axis, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
} as const;
