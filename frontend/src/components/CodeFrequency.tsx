"use client";

import { useState, useEffect } from "react";
import type { CodeFrequency as CodeFrequencyType } from "@/lib/types";
import { getUserCodeFrequency, type Visibility } from "@/lib/api";

interface CodeFrequencyProps {
  username: string;
  visibility?: Visibility;
}

export function CodeFrequency({ username, visibility }: CodeFrequencyProps) {
  const [data, setData] = useState<CodeFrequencyType | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    getUserCodeFrequency(username, visibility)
      .then(setData)
      .catch((err) => console.error("Failed to fetch code frequency:", err))
      .finally(() => setLoading(false));
  }, [username, visibility]);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="mb-4 h-6 w-36 animate-pulse rounded bg-neutral-800" />
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data || data.weeks.length === 0) return null;

  const recentWeeks = data.weeks.slice(-52);
  const maxValue = Math.max(
    ...recentWeeks.map((w) => Math.max(w.additions, w.deletions))
  );

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-200">
            Code Frequency
          </h2>
          <span className="rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-sm text-emerald-400">
            +{formatNumber(data.totalAdditions)}
          </span>
          <span className="rounded-full bg-red-900/50 px-2.5 py-0.5 text-sm text-red-400">
            -{formatNumber(data.totalDeletions)}
          </span>
        </div>
      </div>

      <div className="relative h-32">
        <div className="absolute inset-0 flex items-end gap-px">
          {recentWeeks.map((week, i) => {
            const addHeight = maxValue > 0 ? (week.additions / maxValue) * 100 : 0;
            const delHeight = maxValue > 0 ? (week.deletions / maxValue) * 100 : 0;
            const isHovered = hoveredWeek === i;

            return (
              <div
                key={week.week}
                className="group relative flex flex-1 flex-col items-center justify-end gap-px"
                onMouseEnter={() => setHoveredWeek(i)}
                onMouseLeave={() => setHoveredWeek(null)}
              >
                {isHovered && (
                  <div className="absolute -top-20 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs">
                    <div className="text-neutral-400">{formatDate(week.week)}</div>
                    <div className="text-emerald-400">+{week.additions.toLocaleString()}</div>
                    <div className="text-red-400">-{week.deletions.toLocaleString()}</div>
                  </div>
                )}
                <div
                  className={`w-full rounded-t-sm bg-emerald-500 transition-all ${isHovered ? "bg-emerald-400" : ""}`}
                  style={{ height: `${addHeight}%`, minHeight: week.additions > 0 ? "2px" : 0 }}
                />
                <div
                  className={`w-full rounded-b-sm bg-red-500 transition-all ${isHovered ? "bg-red-400" : ""}`}
                  style={{ height: `${delHeight}%`, minHeight: week.deletions > 0 ? "2px" : 0 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span>Additions</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span>Deletions</span>
        </div>
      </div>
    </div>
  );
}
