import React from "react";

export default function ScoreGauge({ score = 100, size = 120, strokeWidth = 10, showLabel = true, subtitle = "" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const normalizedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (normalizedScore / 100) * circumference;

  let color = "#0f766e";
  let bgColor = "#e8f6f3";
  let labelText = "Compliant";

  if (normalizedScore < 70) {
    color = "#c24145";
    bgColor = "#fcebec";
    labelText = "Critical Risk";
  } else if (normalizedScore < 90) {
    color = "#b7791f";
    bgColor = "#fff7df";
    labelText = "Moderate Risk";
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e4e7ec"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900 tracking-tight">
            {Math.round(normalizedScore)}%
          </span>
          {showLabel && (
            <span
              className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full mt-0.5"
              style={{ backgroundColor: bgColor, color }}
            >
              {labelText}
            </span>
          )}
        </div>
      </div>
      {subtitle && <p className="text-xs text-gray-500 mt-2 font-medium">{subtitle}</p>}
    </div>
  );
}
