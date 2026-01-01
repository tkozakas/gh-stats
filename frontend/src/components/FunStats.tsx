"use client";

import { useState, useEffect } from "react";
import type { FunStats as FunStatsType } from "@/lib/types";
import { getUserFunStats } from "@/lib/api";

interface FunStatsProps {
  username: string;
}

export function FunStats({ username }: FunStatsProps) {
  const [stats, setStats] = useState<FunStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserFunStats(username)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const maxHourCommits = Math.max(...Object.values(stats.commitsByHour || {}), 1);
  const maxDayCommits = Math.max(...Object.values(stats.commitsByDayOfWeek || {}), 1);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <h2 className="mb-6 text-lg font-semibold text-neutral-200">Fun Statistics</h2>

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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-neutral-400">Commits by Hour</h3>
          <div className="flex h-24 items-end gap-0.5">
            {hours.map((hour) => {
              const count = stats.commitsByHour?.[hour] || 0;
              const height = (count / maxHourCommits) * 100;
              return (
                <div
                  key={hour}
                  className="group relative flex-1 rounded-t bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                  style={{ height: `${Math.max(height, 2)}%` }}
                >
                  <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 opacity-0 transition-opacity group-hover:opacity-100">
                    {hour}:00 ({count})
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

        <div>
          <h3 className="mb-3 text-sm font-medium text-neutral-400">Commits by Day</h3>
          <div className="space-y-2">
            {days.map((day) => {
              const count = stats.commitsByDayOfWeek?.[day] || 0;
              const width = (count / maxDayCommits) * 100;
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-neutral-500">{day.slice(0, 3)}</span>
                  <div className="flex-1 h-4 rounded bg-neutral-800">
                    <div
                      className="h-full rounded bg-emerald-500/80"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-neutral-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
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
