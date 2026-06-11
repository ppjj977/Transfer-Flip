// Tiny log-scale sparkline of the held value over the run so far.
interface Props {
  values: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ values, width = 220, height = 44 }: Props) {
  if (values.length < 2) {
    return <div style={{ height }} aria-hidden />;
  }
  const logs = values.map((v) => Math.log(Math.max(v, 1)));
  const min = Math.min(...logs);
  const max = Math.max(...logs);
  const span = max - min || 1;
  const pad = 3;
  const pts = logs.map((l, i) => {
    const x = pad + (i / (logs.length - 1)) * (width - 2 * pad);
    const y = pad + (1 - (l - min) / span) * (height - 2 * pad);
    return [x, y] as const;
  });
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const up = logs[logs.length - 1] >= logs[0];
  const color = up ? '#2fe08a' : '#ff4d4d';
  const [lastX, lastY] = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} />
    </svg>
  );
}
