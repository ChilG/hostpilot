import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/translations";

interface LiveDiffPreviewProps {
  diff: string;
}

export function LiveDiffPreview({ diff }: LiveDiffPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <span className="text-sm font-medium">{t("hostsFilePreview")}</span>
        <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
          {t("live")}
        </Badge>
      </div>
      <div className="p-5">
        {diff ? (
          <pre className="text-xs font-mono bg-muted/40 rounded-lg p-4 leading-6 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
            {diff.split("\n").map((line, idx) => {
              let color = "text-muted-foreground/60";
              let displayLine = line;
              if (line.startsWith("+")) {
                color = "text-emerald-400 bg-emerald-500/5";
                const content = line.slice(1);
                displayLine = content.trim() === "" ? "+" : `+ ${content}`;
              } else if (line.startsWith("-")) {
                color = "text-rose-400 bg-rose-500/5 font-medium";
                const content = line.slice(1);
                displayLine = content.trim() === "" ? "-" : `- ${content}`;
              } else if (line.startsWith(" ")) {
                const content = line.slice(1);
                displayLine = content.trim() === "" ? " " : `  ${content}`;
              }
              return (
                <div key={idx} className={`${color} px-2 py-0.5 rounded-sm`}>
                  {displayLine}
                </div>
              );
            })}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-lg">
            {t("noData")}
          </p>
        )}
      </div>
    </div>
  );
}
