export interface Symlink {
  source: string;
  target: string;
  os: string[];
}

export interface DotfilesYaml {
  symlinks: Symlink[];
  packages: Record<string, unknown>;
  hooks: Record<string, unknown>;
}

export interface Tool {
  name: string;
  configPath: string;
  os: string[];
}

export interface DotfilesConfig {
  repository: string;
  tools: Tool[];
}
