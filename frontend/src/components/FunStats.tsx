"use client";

import { useState, useEffect, useCallback } from "react";
import type { FunStats as FunStatsType } from "@/lib/types";
import { getUserFunStats, type Visibility } from "@/lib/api";

interface FunStatsProps {
  username: string;
  visibility?: Visibility;
}

type ViewMode = "hour" | "day" | "month";
type StatMode = "total" | "average";

function FunStatsSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-6 h-6 w-32 animate-pulse rounded bg-neutral-800" />
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
            <div className="h-8 w-20 animate-pulse rounded bg-neutral-700" style={{ animationDelay: `${i * 80}ms` }} />
            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 80 + 40}ms` }} />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 h-4 w-28 animate-pulse rounded bg-neutral-800" />
          <div className="flex h-24 items-end gap-0.5">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 animate-pulse rounded-t bg-neutral-700"
                style={{
                  height: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 30}ms`,
                }}
              />
            ))}
          </div>
        </div>
        
        <div>
          <div className="mb-3 h-4 w-24 animate-pulse rounded bg-neutral-800" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-12 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 50}ms` }} />
                <div className="flex-1 h-4 rounded bg-neutral-800">
                  <div
                    className="h-full animate-pulse rounded bg-neutral-700"
                    style={{
                      width: `${30 + Math.random() * 50}%`,
                      animationDelay: `${i * 50 + 25}ms`,
                    }}
                  />
                </div>
                <div className="h-4 w-8 animate-pulse rounded bg-neutral-800" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 70}ms` }} />
            <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-neutral-700" style={{ animationDelay: `${i * 70 + 35}ms` }} />
            <div className="mt-1 ml-auto h-4 w-12 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 70 + 70}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FunStats({ username, visibility = "public" }: FunStatsProps) {
  const [stats, setStats] = useState<FunStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("hour");
  const [statMode, setStatMode] = useState<StatMode>("total");

  const fetchStats = useCallback(() => {
    setLoading(true);
    setError(null);
    getUserFunStats(username, visibility)
      .then(setStats)
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [username, visibility]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <FunStatsSkeleton />;
  }

  if (error || !stats) return null;

  const maxHourCommits = Math.max(...Object.values(statMode === "average" ? stats.avgCommitsByHour || {} : stats.commitsByHour || {}), 1);
  const maxDayCommits = Math.max(...Object.values(statMode === "average" ? stats.avgCommitsByDayOfWeek || {} : stats.commitsByDayOfWeek || {}), 1);
  const maxMonthCommits = Math.max(...Object.values(stats.commitsByMonth || {}), 1);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const monthsChronological = Object.entries(stats.commitsByMonth || {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-neutral-200">Fun Statistics</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-neutral-800/50 p-1">
            {(["total", "average"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatMode(mode)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  statMode === mode
                    ? "bg-emerald-600 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {mode === "total" ? "Total" : "Average"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-neutral-800/50 p-1">
            {(["hour", "day", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {mode === "hour" ? "By Hour" : mode === "day" ? "By Day" : "By Month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Most Productive Hour"
          value={`${stats.mostProductiveHour}:00`}
        />
        <StatCard
          label="Most Productive Day"
          value={stats.mostProductiveDay}
        />
        <StatCard
          label="Longest Streak"
          value={`${stats.longestCodingStreak} days`}
        />
        <StatCard
          label="Avg Commits/Day"
          value={stats.averageCommitsPerDay.toFixed(1)}
        />
      </div>

      <div className="mt-8">
        {viewMode === "hour" && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-neutral-400">
              {statMode === "average" ? "Average Commits by Hour" : "Commits by Hour"}
            </h3>
            <div className="flex h-32 items-end gap-0.5">
              {hours.map((hour) => {
                const count = statMode === "average" 
                  ? (stats.avgCommitsByHour?.[hour] || 0)
                  : (stats.commitsByHour?.[hour] || 0);
                const height = (count / maxHourCommits) * 100;
                const displayValue = statMode === "average" ? count.toFixed(2) : count;
                return (
                  <div
                    key={hour}
                    className="group relative flex-1 rounded-t bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap z-10">
                      {hour}:00 ({displayValue})
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
              <span>0:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </div>
        )}

        {viewMode === "day" && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-neutral-400">
              {statMode === "average" ? "Average Commits by Day of Week" : "Commits by Day of Week"}
            </h3>
            <div className="space-y-2">
              {days.map((day) => {
                const count = statMode === "average"
                  ? (stats.avgCommitsByDayOfWeek?.[day] || 0)
                  : (stats.commitsByDayOfWeek?.[day] || 0);
                const width = (count / maxDayCommits) * 100;
                const displayValue = statMode === "average" ? count.toFixed(1) : count;
                return (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-12 text-xs text-neutral-500">{day.slice(0, 3)}</span>
                    <div className="flex-1 h-4 rounded bg-neutral-800">
                      <div
                        className="h-full rounded bg-emerald-500/80"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-neutral-500">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "month" && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-neutral-400">Commits by Month</h3>
            <div className="flex h-32 items-end gap-1 overflow-x-auto pb-6">
              {monthsChronological.map(([monthKey, count]) => {
                const height = (count / maxMonthCommits) * 100;
                const [year, month] = monthKey.split("-");
                const monthLabel = monthNames[parseInt(month, 10) - 1];
                return (
                  <div
                    key={monthKey}
                    className="group relative flex-1 min-w-[24px] rounded-t bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap z-10">
                      {monthLabel} {year} ({count})
                    </div>
                    <div className="absolute top-full left-1/2 mt-1 -translate-x-1/2 text-[10px] text-neutral-500 whitespace-nowrap">
                      {monthLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <PercentCard label="Weekend Warrior" value={stats.weekendWarriorPercent} />
        <PercentCard label="Night Owl (10pm-6am)" value={stats.nightOwlPercent} />
        <PercentCard label="Early Bird (5am-9am)" value={stats.earlyBirdPercent} />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="rounded-lg bg-neutral-800/50 px-4 py-2">
          <span className="text-neutral-400">Total Commits:</span>{" "}
          <span className="font-medium text-neutral-200">{stats.totalCommits}</span>
        </div>
        <div className="rounded-lg bg-neutral-800/50 px-4 py-2">
          <span className="text-neutral-400">Total Repos:</span>{" "}
          <span className="font-medium text-neutral-200">{stats.totalRepositories}</span>
        </div>
        <div className="rounded-lg bg-neutral-800/50 px-4 py-2">
          <span className="text-neutral-400">Most Active:</span>{" "}
          <span className="font-medium text-neutral-200">
            {stats.mostActiveRepo} ({stats.mostActiveRepoCommits})
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
      <div className="text-2xl font-bold text-emerald-400">{value}</div>
      <div className="mt-1 text-sm text-neutral-400">{label}</div>
    </div>
  );
}

function PercentCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-2 h-2 rounded-full bg-neutral-700">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <div className="mt-1 text-right text-sm font-medium text-neutral-200">
        {value.toFixed(1)}%
      </div>
    </div>
  );
}
