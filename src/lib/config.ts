import yaml from "js-yaml";
import type { DotfilesYaml, DotfilesConfig, Tool } from "./types";

const REPO = "tkozakas/.dots";
const REPO_URL = `https://github.com/${REPO}`;
const RAW_URL = `https://raw.githubusercontent.com/${REPO}/master`;

export async function getDotfilesConfig(): Promise<DotfilesConfig> {
  const response = await fetch(`${RAW_URL}/dotfiles.yaml`);
  const text = await response.text();
  const data = yaml.load(text) as DotfilesYaml;

  const toolMap = new Map<string, Tool>();

  for (const symlink of data.symlinks) {
    const match = symlink.source.match(/^configs\/([^/]+)/);
    if (!match) continue;

    const toolName = match[1];
    const existing = toolMap.get(toolName);

    if (existing) {
      for (const os of symlink.os) {
        if (!existing.os.includes(os)) {
          existing.os.push(os);
        }
      }
    } else {
      toolMap.set(toolName, {
        name: toolName,
        configPath: `configs/${toolName}`,
        os: [...symlink.os],
      });
    }
  }

  return {
    repository: REPO_URL,
    tools: Array.from(toolMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  };
}
