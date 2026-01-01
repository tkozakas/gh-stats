"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { searchUsers } from "@/lib/api";
import type { UserSearchResult } from "@/lib/types";

export default function Home() {
  const { auth, loading, login, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const data = await searchUsers(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleUserClick = (username: string) => {
    router.push(`/${username}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">gh-stats</h1>
              <p className="text-xs text-neutral-500">GitHub Analytics</p>
            </div>
          </div>

          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-neutral-400" />
          ) : auth.authenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/${auth.username}`)}
                className="flex items-center gap-2 rounded-full bg-neutral-800/80 px-4 py-2 text-sm text-neutral-200 ring-1 ring-neutral-700 transition-all hover:bg-neutral-700 hover:ring-neutral-600"
              >
                {auth.avatar_url && (
                  <img src={auth.avatar_url} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span>{auth.username}</span>
              </button>
              <button
                onClick={logout}
                className="rounded-full px-3 py-2 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 shadow-lg shadow-white/10 transition-all hover:bg-neutral-100"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Sign in with GitHub
            </button>
          )}
        </header>

        {/* Hero */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Explore GitHub
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"> Statistics</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-neutral-400">
            Discover detailed analytics for any GitHub user. Contributions, languages, streaks, and more.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-12">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
              <svg className="h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GitHub users..."
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/80 py-4 pl-14 pr-32 text-lg text-white placeholder-neutral-500 shadow-xl shadow-black/20 backdrop-blur-sm transition-all focus:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                "Search"
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="mt-8">
            <p className="mb-4 text-sm text-neutral-500">
              {results.count} result{results.count !== 1 ? "s" : ""} found
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {results.users.map((user) => (
                <button
                  key={user.login}
                  onClick={() => handleUserClick(user.login)}
                  className="group flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-left transition-all hover:border-neutral-700 hover:bg-neutral-800/50"
                >
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full ring-2 ring-neutral-800 transition-all group-hover:ring-neutral-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{user.login}</div>
                    <div className="text-sm text-neutral-500">{user.type}</div>
                  </div>
                  <svg className="h-5 w-5 text-neutral-600 transition-colors group-hover:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!results && !error && (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 ring-1 ring-neutral-800">
              <svg className="h-10 w-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-neutral-500">Enter a username to explore their GitHub stats</p>
            {!auth.authenticated && (
              <p className="mt-2 text-sm text-neutral-600">
                Or <button onClick={login} className="text-emerald-500 hover:underline">sign in</button> to view your own profile
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 border-t border-neutral-900 pt-8 text-center">
          <a
            href="https://github.com/tkozakas/gh-stats"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 transition-colors hover:text-neutral-400"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </footer>
      </div>
    </main>
  );
}
