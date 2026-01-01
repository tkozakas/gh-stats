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
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const data = await searchUsers(query);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleUserClick = (username: string) => {
    router.push(`/${username}`);
  };

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-100">gh-stats</h1>
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
          ) : auth.authenticated ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${auth.username}`)}
                className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
              >
                {auth.avatar_url && (
                  <img
                    src={auth.avatar_url}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                )}
                {auth.username}
              </button>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
            >
              Login with GitHub
            </button>
          )}
        </div>

        <p className="mb-8 text-neutral-400">
          View GitHub statistics for any user.{" "}
          {!auth.authenticated && (
            <span className="text-neutral-500">
              Login to see your private contributions.
            </span>
          )}
        </p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GitHub users..."
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
        </form>

        {results && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="mb-4 text-sm text-neutral-400">
              Found {results.count} user{results.count !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {results.users.map((user) => (
                <button
                  key={user.login}
                  onClick={() => handleUserClick(user.login)}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-800 p-3 text-left transition-colors hover:border-neutral-700 hover:bg-neutral-800/50"
                >
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-neutral-200">
                      {user.login}
                    </div>
                    <div className="text-sm text-neutral-500">{user.type}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!results && (
          <div className="text-center text-neutral-500">
            <p>Enter a username to search</p>
          </div>
        )}
      </div>
    </main>
  );
}
