"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export function SectorSparkline({
  data,
  color = "var(--accent)",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) {
    return <div style={{ height }} className="muted text-xs">no data</div>;
  }
  const rows = data.map((v, i) => ({ i, v }));
  const positive = data[data.length - 1] >= data[0];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color === "auto" ? (positive ? "var(--good)" : "var(--bad)") : color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
