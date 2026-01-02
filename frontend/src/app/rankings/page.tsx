"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CountryRanking, GlobalRanking, GlobalUser, CountryUser } from "@/lib/types";
import { getAvailableCountries, getCountryRanking, getGlobalRanking } from "@/lib/api";

function formatCountryName(country: string | undefined): string {
  if (!country) return "Unknown";
  return country
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type RankingSelection = "global" | string;

export default function RankingsPage() {
  const [selection, setSelection] = useState<RankingSelection>("global");
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [globalRanking, setGlobalRanking] = useState<GlobalRanking | null>(null);
  const [countryRanking, setCountryRanking] = useState<CountryRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    getAvailableCountries()
      .then(setCountries)
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, []);

  useEffect(() => {
    async function fetchRanking() {
      try {
        setLoading(true);
        setError(null);

        if (selection === "global") {
          const data = await getGlobalRanking(100);
          setGlobalRanking(data);
          setCountryRanking(null);
        } else {
          const data = await getCountryRanking(selection);
          setCountryRanking(data);
          setGlobalRanking(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchRanking();
  }, [selection]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = countries.filter((country) =>
    formatCountryName(country).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (value: RankingSelection) => {
    setSelection(value);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const displayName = selection === "global" ? "Global" : formatCountryName(selection);

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
          <h1 className="text-3xl font-bold text-neutral-100">GitHub Rankings</h1>
          <p className="mt-2 text-neutral-400">
            Top developers ranked by contributions
          </p>
        </div>

        <div className="mb-8" ref={dropdownRef}>
          <label className="mb-2 block text-sm font-medium text-neutral-400">
            Select Region
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left text-neutral-200 transition-colors hover:border-neutral-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <span className="flex items-center gap-2">
                {selection === "global" ? (
                  <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {displayName}
              </span>
              <svg
                className={`h-5 w-5 text-neutral-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-900">
                <div className="border-b border-neutral-800 p-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search countries..."
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => handleSelect("global")}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-800 ${
                      selection === "global" ? "bg-emerald-500/10 text-emerald-400" : "text-neutral-200"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Global
                  </button>

                  <div className="border-t border-neutral-800" />

                  {countriesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
                    </div>
                  ) : filteredCountries.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-neutral-500">No countries found</div>
                  ) : (
                    filteredCountries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => handleSelect(country)}
                        className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-neutral-800 ${
                          selection === country ? "bg-amber-500/10 text-amber-400" : "text-neutral-200"
                        }`}
                      >
                        <svg className="h-5 w-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {formatCountryName(country)}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && globalRanking && (
          <>
            <p className="mb-4 text-sm text-neutral-500">
              {globalRanking.total} developers worldwide
            </p>
            <div className="space-y-2">
              {globalRanking.users.map((user, index) => (
                <GlobalUserRow key={user.login} user={user} rank={index + 1} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && countryRanking && (
          <>
            <p className="mb-4 text-sm text-neutral-500">
              {countryRanking.users.length} developers in {formatCountryName(selection)}
            </p>
            <div className="space-y-2">
              {countryRanking.users.map((user, index) => (
                <CountryUserRow key={user.login} user={user} rank={index + 1} />
              ))}
            </div>
          </>
        )}

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

function GlobalUserRow({ user, rank }: { user: GlobalUser; rank: number }) {
  return (
    <Link
      href={`/${user.login}`}
      className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <div className="flex h-10 w-10 items-center justify-center">
        {rank <= 3 ? (
          <span className="text-2xl">
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span className="text-lg font-semibold text-neutral-500">#{rank}</span>
        )}
      </div>

      <Image
        src={`https://github.com/${user.login}.png`}
        alt={user.login}
        width={48}
        height={48}
        className="rounded-full border border-neutral-700"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-100 truncate">
            @{user.login}
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
            {formatCountryName(user.country)}
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-lg font-semibold text-emerald-400">
          {user.publicContributions.toLocaleString()}
        </div>
        <div className="text-xs text-neutral-500">contributions</div>
      </div>
    </Link>
  );
}

function CountryUserRow({ user, rank }: { user: CountryUser; rank: number }) {
  return (
    <Link
      href={`/${user.login}`}
      className="flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <div className="flex h-10 w-10 items-center justify-center">
        {rank <= 3 ? (
          <span className="text-2xl">
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        ) : (
          <span className="text-lg font-semibold text-neutral-500">#{rank}</span>
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
          <p className="text-sm text-neutral-500 truncate">{user.location}</p>
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
  );
}
