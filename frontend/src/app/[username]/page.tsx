"use client";

import { use } from "react";
import { Dashboard } from "@/components";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function UserPage({ params }: PageProps) {
  const { username } = use(params);
  return <Dashboard username={username} />;
}
