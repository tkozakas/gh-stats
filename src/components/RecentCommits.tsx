import type { Commit } from "@/lib/types";

interface RecentCommitsProps {
  commits: Commit[];
}

export function RecentCommits({ commits }: RecentCommitsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-neutral-200">
        Recent Activity
      </h2>
      <div className="space-y-3">
        {commits.map((commit, i) => (
          <a
            key={i}
            href={commit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-800/50"
          >
            <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-300 group-hover:text-white">
                  {commit.repo}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatDate(commit.date)}
                </span>
              </div>
              <p className="truncate text-sm text-neutral-400">
                {commit.message}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
