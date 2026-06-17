import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore, type ProxyRule } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import {
  Square,
  Play,
  ShieldAlert,
  Lock,
  ShieldCheck,
  X,
  Globe,
  Pencil,
  Trash2,
} from "lucide-react";

interface ReverseProxyTabProps {
  onEditProxy: (rule: ProxyRule) => void;
  onDeleteProxy: (rule: ProxyRule) => void;
}

export function ReverseProxyTab({ onEditProxy, onDeleteProxy }: ReverseProxyTabProps) {
  const {
    proxyRules,
    proxyRunningPort,
    startProxyServer,
    stopProxyServer,
    settings,
    updateSettings,
    caTrusted,
    installRootCa,
  } = useAppStore();

  const { t } = useTranslation();

  const [proxyPortInput, setProxyPortInput] = useState<number>(8080);
  const [isStarting, setIsStarting] = useState(false);
  const [isInstallingCa, setIsInstallingCa] = useState(false);
  const [showFirefoxHelp, setShowFirefoxHelp] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hostpilot_hide_firefox_help") !== "true";
    }
    return true;
  });

  const dismissFirefoxHelp = () => {
    localStorage.setItem("hostpilot_hide_firefox_help", "true");
    setShowFirefoxHelp(false);
  };

  // Sync input with running proxy port
  useEffect(() => {
    if (proxyRunningPort !== null) {
      setProxyPortInput(proxyRunningPort);
    }
  }, [proxyRunningPort]);

  const handleToggleProxy = async () => {
    if (proxyRunningPort !== null) {
      try {
        await stopProxyServer();
        toast.success(t("proxyStopSuccess"));
      } catch (e) {
        toast.error(t("failedToStopProxy", { error: String(e) }));
      }
    } else {
      if (proxyPortInput <= 0 || proxyPortInput > 65535) {
        toast.error(t("invalidPortNumber"));
        return;
      }
      setIsStarting(true);
      try {
        await startProxyServer(proxyPortInput);
        toast.success(t("proxyStartSuccess", { port: proxyPortInput }));
      } catch (e) {
        toast.error(t("proxyStartFailed", { port: proxyPortInput, error: String(e) }));
      } finally {
        setIsStarting(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Proxy Control Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                proxyRunningPort !== null ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <div>
              <h3 className="text-sm font-semibold">{t("proxyServerEngine")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {proxyRunningPort !== null
                  ? t("proxyRunningDesc", { port: proxyRunningPort })
                  : t("proxyStoppedDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="proxyPort" className="text-xs text-muted-foreground font-mono">
                {t("portNumber")}:
              </Label>
              <Input
                id="proxyPort"
                type="number"
                value={proxyPortInput}
                onChange={(e) => setProxyPortInput(parseInt(e.target.value) || 0)}
                disabled={proxyRunningPort !== null}
                className="w-20 h-8 text-xs font-mono text-center"
              />
            </div>

            <Button
              onClick={handleToggleProxy}
              disabled={isStarting}
              className={`h-8 text-xs font-medium gap-1.5 cursor-pointer ${
                proxyRunningPort !== null
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {proxyRunningPort !== null ? (
                <>
                  <Square className="w-3 h-3" />
                  {t("stopServer")}
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  {isStarting ? t("starting") : t("startServer")}
                </>
              )}
            </Button>
          </div>
        </div>

        {proxyPortInput < 1024 && proxyRunningPort === null && (
          <div className="flex items-start gap-2 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>{t("portPrivilegeWarning")}</p>
          </div>
        )}
      </div>

      {/* HTTPS / SSL Settings Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-400" />
              {t("sslSettings")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t("sslSettingsDesc")}</p>
          </div>

          <div className="flex items-center gap-6">
            {/* HTTPS Port */}
            <div className="flex items-center gap-2">
              <Label htmlFor="sslPort" className="text-xs text-muted-foreground font-mono">
                {t("sslPortLabel")}:
              </Label>
              <Input
                id="sslPort"
                type="number"
                value={settings.sslPort}
                onChange={(e) => updateSettings({ sslPort: parseInt(e.target.value) || 443 })}
                disabled={proxyRunningPort !== null}
                className="w-20 h-8 text-xs font-mono text-center"
              />
            </div>

            {/* Enable HTTPS Switch */}
            <div className="flex items-center gap-2">
              <Label htmlFor="sslEnabled" className="text-xs text-muted-foreground font-mono">
                {t("enableSsl")}:
              </Label>
              <Switch
                id="sslEnabled"
                checked={settings.sslEnabled}
                onCheckedChange={(checked) => updateSettings({ sslEnabled: checked })}
                disabled={proxyRunningPort !== null}
                className="scale-90"
              />
            </div>
          </div>
        </div>

        {/* CA Certificate Status & Actions */}
        <div className="border-t border-border pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="text-muted-foreground block">{t("caCertStatus")}</span>
              <span className="font-semibold flex items-center gap-1.5 mt-0.5">
                {caTrusted ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500">{t("caTrusted")}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span className="text-red-500">{t("caUntrusted")}</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <Button
            variant={caTrusted ? "outline" : "default"}
            size="sm"
            onClick={async () => {
              setIsInstallingCa(true);
              try {
                await installRootCa();
                toast.success(t("notif.caInstalledTitle"));
              } catch (e) {
                toast.error(t("notif.caInstallErrorTitle"), { description: String(e) });
              } finally {
                setIsInstallingCa(false);
              }
            }}
            disabled={caTrusted || isInstallingCa}
            className={`h-8 text-xs font-medium cursor-pointer ${
              !caTrusted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
          >
            {isInstallingCa ? t("installing") : t("installCaButton")}
          </Button>
        </div>

        {/* Privilege Hint */}
        {!caTrusted && (
          <div className="flex items-start gap-2 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>{t("sslPrivilegeHint")}</p>
          </div>
        )}

        {/* Firefox Specific Help Accordion/Tip */}
        {showFirefoxHelp && (
          <div className="relative text-[10px] bg-slate-500/5 border border-border p-3 rounded-lg space-y-1">
            <span className="font-semibold block text-indigo-400">{t("firefoxHelpTitle")}</span>
            <p className="text-muted-foreground leading-relaxed pr-6">{t("firefoxHelpDesc")}</p>
            <button
              onClick={dismissFirefoxHelp}
              className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Proxy rules list */}
      <div className="space-y-2">
        {proxyRules.map((rule) => (
          <ProxyRuleRow
            key={rule.id}
            rule={rule}
            onEdit={onEditProxy}
            onDelete={onDeleteProxy}
          />
        ))}

        {proxyRules.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">{t("noProxyRules")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProxyRuleRowProps {
  rule: ProxyRule;
  onEdit: (rule: ProxyRule) => void;
  onDelete: (rule: ProxyRule) => void;
}

function ProxyRuleRow({ rule, onEdit, onDelete }: ProxyRuleRowProps) {
  const { updateProxyRule } = useAppStore();
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:border-border/60 transition-colors group ${
        !rule.enabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <Switch
          checked={rule.enabled}
          onCheckedChange={() => {
            updateProxyRule(rule.id, { enabled: !rule.enabled });
            toast.success(
              t("proxyRuleToggleSuccess", {
                status: !rule.enabled ? t("statusEnabled") : t("statusDisabled"),
              })
            );
          }}
          className="scale-90"
        />
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-xs text-indigo-400">
              {rule.domain}
              <span className="text-foreground font-normal">{rule.pathPrefix}</span>
            </span>
            <span className="text-muted-foreground text-[10px]">→</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {rule.targetAddress}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              className={`border-0 text-[9px] px-1.5 py-0 ${
                rule.targetType === "local"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-purple-500/10 text-purple-400"
              }`}
            >
              {rule.targetType === "local" ? t("localPort") : t("externalProxy")}
            </Badge>
            {rule.targetType === "external" && rule.customResolver && (
              <Badge className="border-0 bg-slate-500/10 text-slate-400 text-[9px] px-1.5 py-0 font-mono">
                DNS: {rule.customResolver}
              </Badge>
            )}
            {rule.isRegex && (
              <Badge className="border-0 bg-yellow-500/10 text-yellow-400 text-[9px] px-1.5 py-0 font-mono">
                {t("regex")}
              </Badge>
            )}
            {rule.stripPrefix && (
              <Badge className="border-0 bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0 font-mono">
                {t("stripPrefix")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => onEdit(rule)}
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
          onClick={() => onDelete(rule)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
