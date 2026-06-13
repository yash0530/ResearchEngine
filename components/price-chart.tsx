"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGES = { "1M": 22, "3M": 66, "6M": 132, "1Y": 252 } as const;
type RangeKey = keyof typeof RANGES;

const tooltipStyle = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--text)",
};

export function PriceChart({ data }: { data: { d: string; close: number }[] }) {
  const [range, setRange] = useState<RangeKey>("3M");
  const rows = useMemo(() => data.slice(-RANGES[range]), [data, range]);
  const positive = rows.length > 1 && rows[rows.length - 1].close >= rows[0].close;

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        {(Object.keys(RANGES) as RangeKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
              range === key
                ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--soft)]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="d"
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              tickFormatter={(d: string) => d.slice(5)}
              minTickGap={48}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              domain={["auto", "auto"]}
              width={56}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "close"]}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke={positive ? "var(--good)" : "var(--bad)"}
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
