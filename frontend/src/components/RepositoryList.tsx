"use client";

import { useState, useEffect } from "react";
import type { Repository } from "@/lib/types";
import { getUserRepositories } from "@/lib/api";
import { RepoDetail } from "./RepoDetail";

interface RepositoryListProps {
  username: string;
  visibility?: "public" | "private" | "all";
}

export function RepositoryList({ username, visibility = "public" }: RepositoryListProps) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      getUserRepositories(username, query || undefined, visibility)
        .then((data) => setRepos(data.repositories || []))
        .catch(() => setRepos([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [username, query, visibility]);

  if (selectedRepo) {
    return <RepoDetail username={username} name={selectedRepo} onClose={() => setSelectedRepo(null)} />;
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">
          All Repositories ({repos.length})
        </h2>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search repositories..."
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {repos.map((repo) => (
            <button
              key={repo.name}
              onClick={() => setSelectedRepo(repo.name)}
              className="w-full rounded-lg border border-neutral-800 p-3 text-left transition-all hover:border-neutral-700 hover:bg-neutral-800/50"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-neutral-200">{repo.name}</h3>
                <div className="flex items-center gap-2">
                  {repo.language && (
                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                      {repo.language}
                    </span>
                  )}
                  <span className="text-xs text-neutral-500">★ {repo.stargazers_count}</span>
                </div>
              </div>
              {repo.description && (
                <p className="mt-1 line-clamp-1 text-sm text-neutral-400">{repo.description}</p>
              )}
            </button>
          ))}
          {repos.length === 0 && (
            <p className="py-4 text-center text-sm text-neutral-500">No repositories found</p>
          )}
        </div>
      )}
    </div>
  );
}
