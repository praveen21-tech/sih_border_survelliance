"use client";

import { pathFromPoints } from "./chartUtils";

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, color, width = 64, height = 22 }: SparklineProps) {
  const d = pathFromPoints(data, width, height, 3);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", flexShrink: 0 }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle
        cx={width}
        cy={height - 3 - (data[data.length - 1] / Math.max(...data, 1)) * (height - 6)}
        r={1.8}
        fill={color}
      />
    </svg>
  );
}