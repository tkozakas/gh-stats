"use client";

import { useState, useEffect } from "react";
import type { RepoStats as RepoStatsType } from "@/lib/types";
import { getUserRepoStats } from "@/lib/api";

interface RepoDetailProps {
  username: string;
  name: string;
  onClose: () => void;
}

export function RepoDetail({ username, name, onClose }: RepoDetailProps) {
  const [stats, setStats] = useState<RepoStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserRepoStats(username, name)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username, name]);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-center text-neutral-400">Failed to load repository stats</p>
        <button
          onClick={onClose}
          className="mx-auto mt-4 block rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { repository, totalCommits, commitsByDay, commitsByHour, firstCommit, lastCommit } = stats;
  const maxDayCommits = Math.max(...Object.values(commitsByDay || {}), 1);
  const maxHourCommits = Math.max(...Object.values(commitsByHour || {}), 1);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-200">{repository.name}</h2>
          {repository.description && (
            <p className="mt-1 text-sm text-neutral-400">{repository.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
        >
          ← Back
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {repository.language && (
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
            {repository.language}
          </span>
        )}
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
          ★ {repository.stargazers_count}
        </span>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-300">
          {totalCommits} commits
        </span>
        <a
          href={repository.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-emerald-400 hover:bg-neutral-700"
        >
          View on GitHub →
        </a>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-neutral-800/50 p-4">
          <div className="text-sm text-neutral-400">First Commit</div>
          <div className="mt-1 text-neutral-200">
            {firstCommit ? new Date(firstCommit).toLocaleDateString() : "N/A"}
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-4">
          <div className="text-sm text-neutral-400">Last Commit</div>
          <div className="mt-1 text-neutral-200">
            {lastCommit ? new Date(lastCommit).toLocaleDateString() : "N/A"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-neutral-400">Commits by Day</h3>
          <div className="space-y-2">
            {days.map((day) => {
              const count = commitsByDay?.[day] || 0;
              const width = (count / maxDayCommits) * 100;
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-neutral-500">{day.slice(0, 3)}</span>
                  <div className="flex-1 h-3 rounded bg-neutral-800">
                    <div
                      className="h-full rounded bg-emerald-500/80"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-neutral-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-neutral-400">Commits by Hour</h3>
          <div className="flex h-20 items-end gap-0.5">
            {hours.map((hour) => {
              const count = commitsByHour?.[hour] || 0;
              const height = (count / maxHourCommits) * 100;
              return (
                <div
                  key={hour}
                  className="group relative flex-1 rounded-t bg-emerald-500/80 transition-colors hover:bg-emerald-400"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${hour}:00 - ${count} commits`}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>0:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {stats.commits && stats.commits.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-neutral-400">Recent Commits</h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {stats.commits.slice(0, 10).map((commit) => (
              <a
                key={commit.sha}
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-neutral-800/50 p-3 transition-colors hover:bg-neutral-800"
              >
                <p className="line-clamp-1 text-sm text-neutral-200">
                  {commit.message.split("\n")[0]}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(commit.date).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
