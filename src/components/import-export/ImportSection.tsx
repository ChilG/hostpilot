import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { FileJson, Upload, CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { parseRawHostsText, type RawParseResult } from "@/store/helpers/rawHostsParser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ImportSection() {
  const { importConfig, groups, profiles } = useAppStore();
  const { t } = useTranslation();

  // JSON Import State
  const [jsonImportStep, setJsonImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [jsonImportText, setJsonImportText] = useState("");
  const [parsedJsonConfig, setParsedJsonConfig] = useState<any>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  // Raw Import State
  const [rawImportStep, setRawImportStep] = useState<"idle" | "preview" | "done">("idle");
  const [rawText, setRawText] = useState("");
  const [parsedRawResult, setParsedRawResult] = useState<RawParseResult | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("none");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "overwrite" | "duplicate">("skip");
  const [addToActiveProfile, setAddToActiveProfile] = useState(true);

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.active) || profiles[0];
  }, [profiles]);

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId);
  }, [groups, selectedGroupId]);

  // JSON Import Handlers
  const processJsonText = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const hostsData = parsed.hosts || parsed.entries;
      const profilesData = parsed.profiles;
      const groupsData = parsed.groups;
      const portsData = parsed.ports;

      if (hostsData || profilesData || groupsData || portsData) {
        setParsedJsonConfig(parsed);
        setJsonImportText(text);
        setJsonImportStep("preview");
      } else {
        toast.error(t("invalidConfigFormat"));
      }
    } catch (err) {
      toast.error(t("jsonParseError"));
    }
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processJsonText(text);
    };
    reader.readAsText(file);
  };

  const triggerJsonImport = () => {
    if (!parsedJsonConfig) return;
    try {
      const { hostsImported, groupsImported, portsImported } = importConfig(parsedJsonConfig);
      toast.success(t("importSuccessToast"), {
        description: t("importSuccessDetail", {
          hosts: hostsImported,
          groups: groupsImported,
          ports: portsImported,
        }),
      });
      setJsonImportStep("done");
    } catch (err) {
      console.error("Import failed:", err);
      toast.error(t("importFailed"), {
        description: String(err),
      });
    }
  };

  // Raw Import Handlers
  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    const result = parseRawHostsText(rawText);
    if (result.hosts.length === 0) {
      toast.error(t("rawParseError"));
      return;
    }
    setParsedRawResult(result);
    setRawImportStep("preview");
  };

  const triggerRawImport = () => {
    if (!parsedRawResult) return;
    try {
      // Map parsed raw hosts into the format importConfig expects
      const mappedHosts = parsedRawResult.hosts.map((h) => ({
        domain: h.domain,
        ip: h.ip,
        enabled: h.enabled,
        source: "imported" as const,
        // If a group is selected, pass its ID or name. Since it's an existing group,
        // we'll pass the groupId so that mergeImportedConfig can map it via directMatch
        groupId: selectedGroupId !== "none" ? selectedGroupId : undefined,
      }));

      const { hostsImported } = importConfig({
        hosts: mappedHosts,
      }, duplicateStrategy, addToActiveProfile);

      toast.success(t("importSuccessToast"), {
        description: t("rawImportSuccessDetail", {
          hosts: hostsImported,
        }),
      });
      setRawImportStep("done");
    } catch (err) {
      console.error("Raw import failed:", err);
      toast.error(t("importFailed"), {
        description: String(err),
      });
    }
  };

  const resetRawImport = () => {
    setRawText("");
    setParsedRawResult(null);
    setSelectedGroupId("none");
    setDuplicateStrategy("skip");
    setAddToActiveProfile(true);
    setRawImportStep("idle");
  };

  return (
    <div className="space-y-6">
      {/* 1. JSON Config Import Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={jsonFileRef}
          style={{ display: "none" }}
          accept=".json,application/json"
          onChange={handleJsonFileChange}
        />

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <FileJson className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">hostpilot.config.json</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("importConfigDetail")}</p>
          </div>
        </div>

        {jsonImportStep === "idle" && (
          <div className="space-y-3">
            <button
              className="w-full rounded-lg border-2 border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-foreground transition-all cursor-pointer"
              onClick={() => jsonFileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-violet-400" />
              <p className="text-sm font-medium">{t("clickToUploadConfig")}</p>
              <p className="text-xs">{t("supportFormatOnly")}</p>
            </button>
          </div>
        )}

        {jsonImportStep === "preview" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 p-3 max-h-56 overflow-y-auto">
              <p className="text-[10px] font-mono text-muted-foreground/60 mb-2">
                {t("previewImport")}
              </p>
              <pre className="text-xs font-mono text-violet-400 leading-5">{jsonImportText}</pre>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/10 rounded-md px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("validConfigFile")}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs cursor-pointer"
                onClick={() => setJsonImportStep("idle")}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5 cursor-pointer"
                onClick={triggerJsonImport}
              >
                {t("importConfig")}
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {jsonImportStep === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4" />
              {t("importSuccessAlert")}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs cursor-pointer"
              onClick={() => setJsonImportStep("idle")}
            >
              {t("importAnother")}
            </Button>
          </div>
        )}
      </div>

      {/* 2. Raw /etc/hosts Text Import Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t("rawImport")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("rawImportDetail")}</p>
          </div>
        </div>

        {rawImportStep === "idle" && (
          <div className="space-y-4">
            <textarea
              className="w-full p-3 font-mono text-[11px] rounded-lg border border-border bg-muted/10 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 resize-y min-h-[160px] leading-5"
              placeholder={t("rawImportPlaceholder")}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />

            {groups.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground font-medium">
                  {t("assignToGroup")}
                </label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="w-full bg-muted/10 text-xs h-9 cursor-pointer">
                    <SelectValue placeholder={t("selectGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs cursor-pointer">
                      {t("noGroupAssignment")}
                    </SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-xs cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: g.color }}
                          />
                          <span>{g.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">
                {t("duplicateHandling")}
              </label>
              <Select
                value={duplicateStrategy}
                onValueChange={(v) => setDuplicateStrategy(v as "skip" | "overwrite" | "duplicate")}
              >
                <SelectTrigger className="w-full bg-muted/10 text-xs h-9 cursor-pointer">
                  <SelectValue placeholder={t("duplicateHandling")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip" className="text-xs cursor-pointer">
                    {t("duplicateStrategySkip")}
                  </SelectItem>
                  <SelectItem value="overwrite" className="text-xs cursor-pointer">
                    {t("duplicateStrategyOverwrite")}
                  </SelectItem>
                  <SelectItem value="duplicate" className="text-xs cursor-pointer">
                    {t("duplicateStrategyDuplicate")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeProfile ? (
              <div 
                className="flex items-center space-x-2.5 p-3 rounded-lg bg-muted/10 border border-border/50 select-none cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setAddToActiveProfile(!addToActiveProfile)}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  addToActiveProfile ? "bg-violet-600 border-violet-600 text-white" : "border-muted-foreground/45 bg-transparent"
                }`}>
                  {addToActiveProfile && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] font-medium text-foreground">
                  {t("addToActiveProfileText", { name: activeProfile.name })}
                </span>
              </div>
            ) : null}

            <Button
              size="sm"
              className="w-full h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
              onClick={handleParseRawText}
              disabled={!rawText.trim()}
            >
              {t("parseAndPreview")}
            </Button>
          </div>
        )}

        {rawImportStep === "preview" && parsedRawResult && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>{t("rawParseResult", {
                    total: parsedRawResult.stats.parsedHosts,
                    active: parsedRawResult.stats.activeHosts,
                    disabled: parsedRawResult.stats.commentedHosts
                  })}</span>
                </div>
                {parsedRawResult.stats.skippedLines > 0 && (
                  <div className="text-[10px] text-muted-foreground/60 italic">
                    {t("rawSkippedLines", { count: parsedRawResult.stats.skippedLines })}
                  </div>
                )}
                {selectedGroupId !== "none" && (
                  <div className="text-[11px] text-violet-400 flex items-center gap-1.5 mt-1 font-medium">
                    <span>➔ {t("group")}:</span>
                    {selectedGroup ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedGroup.color }} />
                        {selectedGroup.name}
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="text-[11px] text-violet-400/80 flex items-center gap-1.5 mt-1 font-medium">
                  <span>➔ {t("duplicateHandling")}:</span>
                  <span>
                    {duplicateStrategy === "skip" 
                      ? t("duplicateStrategySkip") 
                      : duplicateStrategy === "overwrite" 
                        ? t("duplicateStrategyOverwrite") 
                        : t("duplicateStrategyDuplicate")}
                  </span>
                </div>
                {addToActiveProfile && (
                  <div className="text-[11px] text-violet-400/80 flex items-center gap-1.5 mt-1 font-medium">
                    <span>➔ {t("activeProfile")}:</span>
                    <span>{activeProfile ? activeProfile.name : "None"}</span>
                  </div>
                )}
              </div>

              {/* Mapped hosts detailed list view */}
              <div className="rounded-lg border border-border max-h-48 overflow-y-auto divide-y divide-border bg-muted/10 font-mono text-[10px]">
                {parsedRawResult.hosts.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-muted/35">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-muted-foreground/60 w-16 shrink-0 truncate">{h.ip}</span>
                      <span className="text-foreground font-medium truncate">{h.domain}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] shrink-0 ${
                      h.enabled 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-muted text-muted-foreground/75 border border-border/40"
                    }`}>
                      {h.enabled ? t("active") : t("inactive")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs cursor-pointer"
                onClick={() => setRawImportStep("idle")}
              >
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5 cursor-pointer"
                onClick={triggerRawImport}
              >
                {t("importHosts", { count: parsedRawResult.hosts.length })}
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {rawImportStep === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4" />
              {t("rawImportSuccessAlert")}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs cursor-pointer"
              onClick={resetRawImport}
            >
              {t("importAnother")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

