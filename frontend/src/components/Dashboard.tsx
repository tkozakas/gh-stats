"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { GitHubStats, UserRanking } from "@/lib/types";
import { getUserStats, getUserRanking } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { Profile } from "./Profile";
import { StreakStats } from "./StreakStats";
import { ContributionGraph } from "./ContributionGraph";
import { Languages } from "./Languages";
import { TopRepos } from "./TopRepos";
import { FunStats } from "./FunStats";
import { RepositoryList } from "./RepositoryList";
import { UserListModal } from "./UserListModal";

interface DashboardProps {
  username: string;
}

type Visibility = "public" | "private" | "all";

function extractCountryFromLocation(location: string): string | null {
  const segments = location.split("/").map((s) => s.trim());
  
  for (const segment of segments) {
    const parts = segment.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }
  
  const parts = location.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  
  return parts[0] || null;
}

function StreakStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-center">
          <div className="mx-auto h-10 w-16 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 100}ms` }} />
          <div className="mx-auto mt-2 h-4 w-24 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 100 + 50}ms` }} />
          <div className="mx-auto mt-1 h-3 w-12 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 100 + 100}ms` }} />
        </div>
      ))}
    </div>
  );
}

function RefetchingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-neutral-950/60 backdrop-blur-[2px]">
      <div className="flex items-center gap-2 rounded-lg bg-neutral-800/90 px-3 py-2 text-sm text-neutral-300">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-emerald-400" />
        Updating...
      </div>
    </div>
  );
}

function LanguagesSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 h-6 w-24 animate-pulse rounded bg-neutral-800" />
      <div className="mb-4 flex h-4 gap-0.5 overflow-hidden rounded-full">
        {[40, 25, 20, 10, 5].map((w, i) => (
          <div
            key={i}
            className="h-full animate-pulse rounded-full bg-neutral-700"
            style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-3 animate-pulse rounded-full bg-neutral-700" />
            <div className="h-4 w-16 animate-pulse rounded bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContributionGraphSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 h-6 w-44 animate-pulse rounded bg-neutral-800" />
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {Array.from({ length: 52 }).map((_, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <div
                  key={dayIndex}
                  className="h-3 w-3 animate-pulse rounded-sm bg-neutral-800"
                  style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 2}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-500">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 w-3 animate-pulse rounded-sm bg-neutral-800" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function TopReposSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 h-6 w-36 animate-pulse rounded bg-neutral-800" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-neutral-800 p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div className="h-5 w-32 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="h-5 w-16 animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 50 + 25}ms` }} />
            </div>
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-neutral-800" style={{ animationDelay: `${i * 50 + 50}ms` }} />
            <div className="mt-3 flex gap-4">
              <div className="h-3 w-10 animate-pulse rounded bg-neutral-800" />
              <div className="h-3 w-10 animate-pulse rounded bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start animate-pulse">
      <div className="h-32 w-32 rounded-full bg-neutral-800" />
      <div className="text-center sm:text-left flex-1">
        <div className="h-8 w-48 bg-neutral-800 rounded mb-2" />
        <div className="h-5 w-32 bg-neutral-800 rounded mb-4" />
        <div className="h-4 w-64 bg-neutral-800 rounded mb-4" />
        <div className="flex gap-6 justify-center sm:justify-start">
          <div className="h-12 w-16 bg-neutral-800 rounded" />
          <div className="h-12 w-16 bg-neutral-800 rounded" />
          <div className="h-12 w-16 bg-neutral-800 rounded" />
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ username }: DashboardProps) {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [ranking, setRanking] = useState<UserRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [modal, setModal] = useState<"followers" | "following" | null>(null);
  const reposRef = useRef<HTMLDivElement>(null);
  const { auth, login, logout } = useAuth();
  const router = useRouter();

  const isOwnProfile = auth.authenticated && auth.username?.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    if (isOwnProfile) {
      setVisibility("all");
    } else {
      setVisibility("public");
    }
  }, [isOwnProfile]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserStats(
        username,
        selectedLanguage ?? undefined,
        isOwnProfile ? visibility : "public"
      );
      setStats(data);
      setError(null);

      if (selectedLanguage && !data.languages.some(l => l.name === selectedLanguage)) {
        setSelectedLanguage(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [username, selectedLanguage, visibility, isOwnProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!stats?.profile.location) return;
    
    const country = extractCountryFromLocation(stats.profile.location);
    if (!country) return;

    getUserRanking(username, country)
      .then((result) => {
        if (result.found && result.ranking) {
          setRanking(result.ranking);
        }
      })
      .catch(() => {});
  }, [username, stats?.profile.location]);

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Header
          auth={auth}
          login={login}
          logout={logout}
          onBack={() => router.push("/")}
          onProfile={() => auth.username && router.push(`/${auth.username}`)}
          isOwnProfile={isOwnProfile}
          visibility={visibility}
          onVisibilityChange={isOwnProfile ? setVisibility : undefined}
        />

        {error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {!stats ? (
              <ProfileSkeleton />
            ) : (
              <div className="relative">
                {loading && <RefetchingOverlay />}
                <Profile 
                  profile={stats.profile} 
                  ranking={ranking}
                  onFollowersClick={() => setModal("followers")}
                  onFollowingClick={() => setModal("following")}
                  onReposClick={() => reposRef.current?.scrollIntoView({ behavior: "smooth" })}
                />
              </div>
            )}

            {modal && (
              <UserListModal
                username={username}
                type={modal}
                onClose={() => setModal(null)}
              />
            )}

            {!auth.authenticated && !loading && (
              <LoginBanner login={login} />
            )}

            <div className="mt-12 space-y-8">
              {!stats ? (
                <StreakStatsSkeleton />
              ) : (
                <div className="relative">
                  {loading && <RefetchingOverlay />}
                  <StreakStats streak={stats.streak} />
                </div>
              )}

              <FunStats username={username} visibility={isOwnProfile ? visibility : "public"} />

              {!stats ? (
                <ContributionGraphSkeleton />
              ) : (
                <div className="relative">
                  {loading && <RefetchingOverlay />}
                  <ContributionGraph 
                    contributions={stats.contributions} 
                    username={username}
                    totalContributions={stats.streak.totalContributions}
                  />
                </div>
              )}

              <div className="grid gap-8 lg:grid-cols-2">
                {!stats ? (
                  <>
                    <LanguagesSkeleton />
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
                      <div className="mb-4 h-6 w-16 animate-pulse rounded bg-neutral-800" />
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex justify-between" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="h-4 w-32 animate-pulse rounded bg-neutral-800" />
                            <div className="h-4 w-16 animate-pulse rounded bg-neutral-800" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      {loading && <RefetchingOverlay />}
                      <Languages
                        languages={stats.languages}
                        selectedLanguage={selectedLanguage}
                        onLanguageClick={setSelectedLanguage}
                      />
                    </div>
                    <div className="relative">
                      {loading && <RefetchingOverlay />}
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
                          {isOwnProfile && (
                            <div className="flex justify-between">
                              <span className="text-neutral-400">Visibility</span>
                              <span className="text-emerald-400 capitalize">{visibility}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!stats ? (
                <TopReposSkeleton />
              ) : (
                <div className="relative">
                  {loading && <RefetchingOverlay />}
                  <TopRepos 
                    repositories={stats.repositories} 
                    username={username}
                    visibility={isOwnProfile ? visibility : "public"}
                  />
                </div>
              )}

              <div ref={reposRef}>
                <RepositoryList username={username} visibility={isOwnProfile ? visibility : "public"} />
              </div>
            </div>

            {stats && (
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
            )}
          </>
        )}
      </div>
    </main>
  );
}

interface HeaderProps {
  auth: { authenticated: boolean; username?: string; avatar_url?: string };
  login: () => void;
  logout: () => Promise<void>;
  onBack: () => void;
  onProfile: () => void;
  isOwnProfile?: boolean;
  visibility?: Visibility;
  onVisibilityChange?: (v: Visibility) => void;
}

function Header({ auth, login, logout, onBack, onProfile, isOwnProfile, visibility, onVisibilityChange }: HeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <button
        onClick={onBack}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to search
      </button>
      <div className="flex items-center gap-4">
        {isOwnProfile && onVisibilityChange && (
          <div className="flex items-center gap-1 rounded-lg bg-neutral-800/50 p-1">
            {(["all", "public", "private"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onVisibilityChange(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  visibility === v
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {v === "all" ? "All" : v === "public" ? "Public" : "Private"}
              </button>
            ))}
          </div>
        )}
        {auth.authenticated ? (
          <>
            <button
              onClick={onProfile}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              {auth.avatar_url && (
                <Image
                  src={auth.avatar_url}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              {auth.username}
            </button>
            <button
              onClick={logout}
              className="text-sm text-neutral-500 hover:text-neutral-300"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
}

function LoginBanner({ login }: { login: () => void }) {
  return (
    <div className="mt-6 rounded-xl border border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-200">
            Is this your profile?
          </p>
          <p className="text-xs text-neutral-500">
            Login to see your private repositories and contributions
          </p>
        </div>
        <button
          onClick={login}
          className="shrink-0 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-600"
        >
          Login with GitHub
        </button>
      </div>
    </div>
  );
}
