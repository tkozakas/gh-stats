import { getDotfilesConfig } from "@/lib/config";
import { Dotfiles } from "@/components";

export default async function Home() {
  const config = await getDotfilesConfig();

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-16 text-center">
          <h1 className="bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
            .dotfiles
          </h1>
          <p className="mt-4 text-lg text-neutral-500">
            software engineer with a vibe-coding addiction
          </p>
          <a
            href={config.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-6 py-2 text-sm text-neutral-400 transition-all hover:border-neutral-700 hover:text-neutral-200"
          >
            <span></span>
            <span>view repository</span>
          </a>
        </header>

        <Dotfiles config={config} />

        <footer className="mt-20 border-t border-neutral-900 pt-8 text-center text-sm text-neutral-600">
          <a
            href="https://github.com/tkozakas"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-400"
          >
            @tkozakas
          </a>
        </footer>
      </div>
    </main>
  );
}
