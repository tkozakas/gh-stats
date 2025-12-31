import type { DotfilesConfig, Tool } from "@/lib/types";

interface DotfilesProps {
  config: DotfilesConfig;
}

function ToolCard({ tool, repoUrl }: { tool: Tool; repoUrl: string }) {
  const configUrl = `${repoUrl}/tree/master/${tool.configPath}`;
  const displayName = tool.name.charAt(0).toUpperCase() + tool.name.slice(1);

  return (
    <a
      href={configUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition-all duration-300 hover:border-neutral-600 hover:bg-neutral-900 hover:shadow-lg hover:shadow-neutral-900/50"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/0 to-neutral-800/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-200 transition-colors group-hover:text-white">
            {displayName}
          </h3>
          <div className="flex gap-1">
            {tool.os.includes("darwin") && (
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                
              </span>
            )}
            {tool.os.includes("linux") && (
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-neutral-600 transition-colors group-hover:text-neutral-500">
          <span className="font-mono">{tool.configPath}</span>
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            →
          </span>
        </div>
      </div>
    </a>
  );
}

export function Dotfiles({ config }: DotfilesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {config.tools.map((tool) => (
        <ToolCard key={tool.name} tool={tool} repoUrl={config.repository} />
      ))}
    </div>
  );
}
