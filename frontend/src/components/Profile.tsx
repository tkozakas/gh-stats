import Image from "next/image";
import Link from "next/link";
import type { GitHubProfile, UserRanking } from "@/lib/types";

interface ProfileProps {
  profile: GitHubProfile;
  ranking?: UserRanking | null;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onReposClick?: () => void;
}

function formatCountryName(country: string): string {
  return country
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function Profile({ profile, ranking, onFollowersClick, onFollowingClick, onReposClick }: ProfileProps) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <Image
        src={profile.avatar_url}
        alt={profile.name || profile.login}
        width={128}
        height={128}
        className="rounded-full border-2 border-neutral-800"
      />
      <div className="text-center sm:text-left">
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <h1 className="text-3xl font-bold text-neutral-100">
            {profile.name || profile.login}
          </h1>
          {ranking && (
            <Link
              href={`/country/${ranking.country}`}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-3 py-1 text-sm font-medium text-amber-400 hover:from-amber-500/30 hover:to-orange-500/30 transition-colors"
            >
              <span className="text-amber-300">#{ranking.countryRank}</span>
              <span className="text-neutral-400">in</span>
              <span>{formatCountryName(ranking.country)}</span>
            </Link>
          )}
        </div>
        <p className="text-lg text-neutral-400">@{profile.login}</p>
        {profile.bio && (
          <p className="mt-2 max-w-md text-neutral-300">{profile.bio}</p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-neutral-400 sm:justify-start">
          {profile.location && (
            <span className="flex items-center gap-1">
              <span></span> {profile.location}
            </span>
          )}
          {profile.company && (
            <span className="flex items-center gap-1">
              <span></span> {profile.company}
            </span>
          )}
          {profile.blog && (
            <a
              href={
                profile.blog.startsWith("http")
                  ? profile.blog
                  : `https://${profile.blog}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-neutral-200"
            >
              <span></span> {profile.blog}
            </a>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-6 sm:justify-start">
          <button 
            onClick={onFollowersClick}
            className="text-center transition-colors hover:text-emerald-400"
          >
            <div className="text-2xl font-bold text-neutral-100">
              {profile.followers}
            </div>
            <div className="text-xs text-neutral-500">followers</div>
          </button>
          <button 
            onClick={onFollowingClick}
            className="text-center transition-colors hover:text-emerald-400"
          >
            <div className="text-2xl font-bold text-neutral-100">
              {profile.following}
            </div>
            <div className="text-xs text-neutral-500">following</div>
          </button>
          <button 
            onClick={onReposClick}
            className="text-center transition-colors hover:text-emerald-400"
          >
            <div className="text-2xl font-bold text-neutral-100">
              {profile.public_repos}
            </div>
            <div className="text-xs text-neutral-500">repos</div>
          </button>
          {ranking && (
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">
                {ranking.publicContributions.toLocaleString()}
              </div>
              <div className="text-xs text-neutral-500">contributions</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
