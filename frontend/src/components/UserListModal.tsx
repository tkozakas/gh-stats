"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getUserFollowers, getUserFollowing } from "@/lib/api";

interface User {
  login: string;
  avatar_url: string;
}

interface UserListModalProps {
  username: string;
  type: "followers" | "following";
  onClose: () => void;
}

export function UserListModal({ username, type, onClose }: UserListModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        if (type === "followers") {
          const data = await getUserFollowers(username);
          setUsers(data.followers);
        } else {
          const data = await getUserFollowing(username);
          setUsers(data.following);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [username, type]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 p-4">
          <h2 className="text-lg font-semibold text-neutral-200 capitalize">
            {type}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
            </div>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-400">{error}</p>
          ) : users.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-500">
              No {type} yet
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <Link
                  key={user.login}
                  href={`/${user.login}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-neutral-800"
                >
                  <Image
                    src={user.avatar_url}
                    alt={user.login}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span className="font-medium text-neutral-200">
                    {user.login}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
