import React from "react";

export default function TrendChart({ locationName = "Overall Footprint" }) {
  const points = [
    { month: "May", score: 94 },
    { month: "Jun", score: 91 },
    { month: "Jul", score: 85 },
    { month: "Aug", score: 76 },
    { month: "Sep", score: 88 },
    { month: "Oct (Live)", score: 87.5 },
  ];

  const width = 600;
  const height = 180;
  const padding = 35;

  const minScore = 50;
  const maxScore = 100;

  const getX = (idx) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
  const getY = (score) => height - padding - ((score - minScore) / (maxScore - minScore)) * (height - 2 * padding);

  const pathData = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.score)}`)
    .join(" ");

  const areaData = `${pathData} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Historical Compliance Trend</h3>
          <p className="text-xs text-gray-500 mt-0.5">Historical monthly audit snapshots for {locationName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Live Snapshot
          </span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          {/* Grid lines */}
          {[60, 75, 90, 100].map((val) => (
            <g key={val}>
              <line
                x1={padding}
                y1={getY(val)}
                x2={width - padding}
                y2={getY(val)}
                stroke="#f3f4f6"
                strokeDasharray="4 4"
              />
              <text x={padding - 8} y={getY(val) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {val}%
              </text>
            </g>
          ))}

          {/* Area gradient */}
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <path d={areaData} fill="url(#scoreGrad)" />
          <path d={pathData} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={p.month} className="group cursor-pointer">
              <circle
                cx={getX(i)}
                cy={getY(p.score)}
                r="5"
                fill="#ffffff"
                stroke="#4f46e5"
                strokeWidth="2.5"
                className="transition-transform group-hover:scale-125"
              />
              <text
                x={getX(i)}
                y={getY(p.score) - 10}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill="#374151"
              >
                {p.score}%
              </text>
              <text
                x={getX(i)}
                y={height - padding + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
              >
                {p.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
