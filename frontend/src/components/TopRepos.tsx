"use client";

import { useState, useEffect } from "react";
import type { Repository } from "@/lib/types";
import { getUserRepoCommits, type Visibility } from "@/lib/api";

interface TopReposProps {
  repositories: Repository[];
  username: string;
  visibility?: Visibility;
}

export function TopRepos({ repositories, username, visibility = "public" }: TopReposProps) {
  const [commitsByRepo, setCommitsByRepo] = useState<Record<string, number>>({});

  useEffect(() => {
    getUserRepoCommits(username, visibility)
      .then((data) => setCommitsByRepo(data.commitsByRepo))
      .catch(() => {});
  }, [username, visibility]);

  if (!repositories?.length) return null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-neutral-200">
        Top Repositories
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {repositories.slice(0, 6).map((repo) => (
          <a
            key={repo.name}
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-lg border border-neutral-800 p-4 transition-all hover:border-neutral-700 hover:bg-neutral-800/50"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-neutral-200 group-hover:text-white">
                {repo.name}
              </h3>
              {repo.language && (
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                  {repo.language}
                </span>
              )}
            </div>
            {repo.description && (
              <p className="mt-2 line-clamp-2 text-sm text-neutral-400">
                {repo.description}
              </p>
            )}
            <div className="mt-3 flex gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <span>★</span> {repo.stargazers_count}
              </span>
              <span className="flex items-center gap-1">
                <span></span> {repo.forks_count}
              </span>
              {commitsByRepo[repo.name] > 0 && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <span>●</span> {commitsByRepo[repo.name]} commits
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
