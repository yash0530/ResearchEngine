"use client";

import { useEffect, useState, useRef } from "react";
import { Line, LineChart, YAxis } from "recharts";

export function SectorSparkline({
  data,
  color = "var(--accent)",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    setWidth(containerRef.current.clientWidth);

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (data.length < 2) {
    return <div style={{ height }} className="muted text-xs">no data</div>;
  }

  const rows = data.map((v, i) => ({ i, v }));
  const positive = data[data.length - 1] >= data[0];
  return (
    <div ref={containerRef} style={{ height }} className="w-full">
      {width > 0 ? (
        <LineChart width={width} height={height} data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
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
      ) : null}
    </div>
  );
}
