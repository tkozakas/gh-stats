import { Dashboard } from "@/components";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function UserPage({ params }: PageProps) {
  const { username } = await params;
  return <Dashboard username={username} />;
}
