"use client";

import { useState, useEffect, useCallback } from "react";
import type { GitHubStats } from "@/lib/types";
import { getStats } from "@/lib/api";
import { Profile } from "./Profile";
import { StreakStats } from "./StreakStats";
import { ContributionGraph } from "./ContributionGraph";
import { Languages } from "./Languages";
import { TopRepos } from "./TopRepos";
import { FunStats } from "./FunStats";
import { RepositoryList } from "./RepositoryList";

export function Dashboard() {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStats(selectedLanguage ?? undefined);
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !stats) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Profile profile={stats.profile} />

        <div className="mt-12 space-y-8">
          <StreakStats streak={stats.streak} />
          <FunStats />
          <ContributionGraph contributions={stats.contributions} />

          <div className="grid gap-8 lg:grid-cols-2">
            <Languages
              languages={stats.languages}
              selectedLanguage={selectedLanguage}
              onLanguageClick={setSelectedLanguage}
            />
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-200">
                Stats
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Repositories shown</span>
                  <span className="text-neutral-200">
                    {stats.repositories.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Last updated</span>
                  <span className="text-neutral-200">
                    {new Date(stats.updatedAt).toLocaleString()}
                  </span>
                </div>
                {selectedLanguage && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Filtered by</span>
                    <span className="text-neutral-200">{selectedLanguage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <TopRepos repositories={stats.repositories} />
          <RepositoryList />
        </div>

        <footer className="mt-20 border-t border-neutral-900 pt-8 text-center text-sm text-neutral-600">
          <a
            href={`https://github.com/${stats.profile.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-400"
          >
            @{stats.profile.login}
          </a>
        </footer>
      </div>
    </main>
  );
}
