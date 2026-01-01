import type { LanguageStats } from "@/lib/types";

interface LanguagesProps {
  languages: LanguageStats[];
  selectedLanguage?: string | null;
  onLanguageClick?: (language: string | null) => void;
}

export function Languages({
  languages,
  selectedLanguage,
  onLanguageClick,
}: LanguagesProps) {
  if (!languages?.length) return null;

  const handleClick = (langName: string) => {
    if (!onLanguageClick) return;
    const isDeselecting = selectedLanguage === langName;
    onLanguageClick(isDeselecting ? null : langName);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">Languages</h2>
        {selectedLanguage && onLanguageClick && (
          <button
            onClick={() => onLanguageClick(null)}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="mb-4 flex h-4 overflow-hidden rounded-full">
        {languages.map((lang) => (
          <div
            key={lang.name}
            onClick={() => handleClick(lang.name)}
            className={`transition-all ${onLanguageClick ? "cursor-pointer" : ""} ${
              selectedLanguage && selectedLanguage !== lang.name
                ? "opacity-30"
                : "hover:opacity-80"
            }`}
            style={{
              width: `${lang.percentage}%`,
              backgroundColor: lang.color,
            }}
            title={`${lang.name}: ${lang.percentage}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {languages.map((lang) => (
          <button
            key={lang.name}
            onClick={() => handleClick(lang.name)}
            className={`flex items-center gap-2 text-sm transition-opacity ${
              onLanguageClick ? "cursor-pointer" : ""
            } ${
              selectedLanguage && selectedLanguage !== lang.name
                ? "opacity-40"
                : "hover:opacity-80"
            } ${selectedLanguage === lang.name ? "ring-1 ring-neutral-600 rounded px-1 -mx-1" : ""}`}
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: lang.color }}
            />
            <span className="text-neutral-300">{lang.name}</span>
            <span className="text-neutral-500">{lang.percentage}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
