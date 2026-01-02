"use client";

import { useState, useEffect } from "react";
import type { ContributionWeek } from "@/lib/types";
import { getUserContributions } from "@/lib/api";

interface ContributionGraphProps {
  contributions: ContributionWeek[];
  username: string;
  totalContributions?: number;
}

const levelColors = [
  "bg-neutral-800",
  "bg-emerald-900",
  "bg-emerald-700",
  "bg-emerald-500",
  "bg-emerald-400",
];

export function ContributionGraph({
  contributions: initialContributions,
  username,
  totalContributions: initialTotal,
}: ContributionGraphProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2007 }, (_, i) => currentYear - i);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [contributions, setContributions] = useState(initialContributions);
  const [totalContributions, setTotalContributions] = useState(initialTotal ?? 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedYear === null) {
      setContributions(initialContributions);
      setTotalContributions(initialTotal ?? 0);
      return;
    }

    setLoading(true);
    getUserContributions(username, selectedYear)
      .then((data) => {
        setContributions(data.contributions);
        setTotalContributions(data.totalContributions);
      })
      .catch((err) => {
        console.error("Failed to fetch contributions:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedYear, username, initialContributions, initialTotal]);

  if (!contributions?.length && !loading) return null;

  const recentWeeks = contributions.slice(-52);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-200">
            Contribution Activity
          </h2>
          {totalContributions > 0 && (
            <span className="rounded-full bg-emerald-900/50 px-2.5 py-0.5 text-sm text-emerald-400">
              {totalContributions.toLocaleString()} contributions
            </span>
          )}
        </div>
        <select
          value={selectedYear ?? ""}
          onChange={(e) =>
            setSelectedYear(e.target.value ? Number(e.target.value) : null)
          }
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
        >
          <option value="">Last 12 months</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="flex gap-1">
              {recentWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.days.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`h-3 w-3 rounded-sm ${levelColors[day.level]} transition-all hover:scale-125`}
                      title={`${day.date}: ${day.count} contributions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-500">
            <span>Less</span>
            {levelColors.map((color, i) => (
              <div key={i} className={`h-3 w-3 rounded-sm ${color}`} />
            ))}
            <span>More</span>
          </div>
        </>
      )}
    </div>
  );
}
