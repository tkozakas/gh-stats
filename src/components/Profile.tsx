import Image from "next/image";
import type { GitHubProfile } from "@/lib/types";

interface ProfileProps {
  profile: GitHubProfile;
}

export function Profile({ profile }: ProfileProps) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <Image
        src={profile.avatarUrl}
        alt={profile.name}
        width={128}
        height={128}
        className="rounded-full border-2 border-neutral-800"
      />
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold text-neutral-100">{profile.name}</h1>
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
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-100">
              {profile.followers}
            </div>
            <div className="text-xs text-neutral-500">followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-100">
              {profile.following}
            </div>
            <div className="text-xs text-neutral-500">following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-100">
              {profile.publicRepos}
            </div>
            <div className="text-xs text-neutral-500">repos</div>
          </div>
        </div>
      </div>
    </div>
  );
}
