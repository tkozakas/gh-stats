"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CountryRanking } from "@/lib/types";
import { getCountryRanking } from "@/lib/api";

interface PageProps {
  params: Promise<{ country: string }>;
}

function formatCountryName(country: string): string {
  return country
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CountryPage({ params }: PageProps) {
  const { country } = use(params);
  const [ranking, setRanking] = useState<CountryRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoading(true);
        const data = await getCountryRanking(country);
        setRanking(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchRanking();
  }, [country]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <button
            onClick={() => router.push("/")}
            className="mb-8 text-sm text-neutral-400 hover:text-neutral-200"
          >
            ← Back to search
          </button>
          <div className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!ranking) return null;

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <button
          onClick={() => router.push("/")}
          className="mb-8 text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Back to search
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-100">
            Top GitHub Users in {formatCountryName(country)}
          </h1>
          <p className="mt-2 text-neutral-400">
            {ranking.users.length} developers ranked by contributions
          </p>
        </div>

        <div className="space-y-2">
          {ranking.users.map((user, index) => (
            <Link
              key={user.login}
              href={`/${user.login}`}
              className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              <div className="flex h-10 w-10 items-center justify-center">
                {index < 3 ? (
                  <span
                    className={`text-2xl font-bold ${
                      index === 0
                        ? "text-amber-400"
                        : index === 1
                          ? "text-neutral-300"
                          : "text-amber-600"
                    }`}
                  >
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-neutral-500">
                    #{index + 1}
                  </span>
                )}
              </div>

              <Image
                src={user.avatarUrl}
                alt={user.name || user.login}
                width={48}
                height={48}
                className="rounded-full border border-neutral-700"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-100 truncate">
                    {user.name || user.login}
                  </span>
                  <span className="text-sm text-neutral-500">@{user.login}</span>
                </div>
                {user.location && (
                  <p className="text-sm text-neutral-500 truncate">
                    {user.location}
                  </p>
                )}
              </div>

              <div className="flex gap-6 text-right">
                <div>
                  <div className="text-lg font-semibold text-emerald-400">
                    {user.publicContributions.toLocaleString()}
                  </div>
                  <div className="text-xs text-neutral-500">contributions</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-neutral-300">
                    {user.followers.toLocaleString()}
                  </div>
                  <div className="text-xs text-neutral-500">followers</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <footer className="mt-12 border-t border-neutral-900 pt-8 text-center text-sm text-neutral-600">
          Data from{" "}
          <a
            href="https://github.com/gayanvoice/top-github-users"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-400"
          >
            gayanvoice/top-github-users
          </a>
        </footer>
      </div>
    </main>
  );
}
