import { useState, useEffect } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppStore, type PortRule, type ProxyRule } from "@/store/AppStore";
import { PortFormDialog } from "@/components/ports/PortFormDialog";
import { ProxyFormDialog } from "@/components/ports/ProxyFormDialog";
import { useTranslation } from "@/i18n/translations";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Plug,
  Play,
  Square,
  Globe,
  ShieldAlert
} from "lucide-react";

export function PortsPage() {
  const {
    ports,
    updatePort,
    deletePort,
    checkPortLive,
    proxyRules,
    proxyRunningPort,
    updateProxyRule,
    deleteProxyRule,
    startProxyServer,
    stopProxyServer,
  } = useAppStore();
  
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>("ports");

  // Ports states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<PortRule | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<PortRule | undefined>();

  // Proxy states
  const [proxyFormOpen, setProxyFormOpen] = useState(false);
  const [proxyFormMode, setProxyFormMode] = useState<"create" | "edit">("create");
  const [proxyEditTarget, setProxyEditTarget] = useState<ProxyRule | undefined>();
  const [proxyDeleteTarget, setProxyDeleteTarget] = useState<ProxyRule | undefined>();
  const [proxyPortInput, setProxyPortInput] = useState<number>(8080);
  const [isStarting, setIsStarting] = useState(false);

  const runningPorts = ports.filter((p) => p.status === "running").length;
  const runningProxyRules = proxyRules.filter((r) => r.enabled).length;

  const statusConfig: Record<PortRule["status"], { label: string; className: string; dot: string }> = {
    running: { label: t("running"), className: "bg-emerald-500/15 text-emerald-400", dot: "bg-emerald-500" },
    stopped: { label: t("stopped"), className: "bg-red-500/15 text-red-400", dot: "bg-red-500" },
    unknown: { label: t("unknown"), className: "bg-amber-500/15 text-amber-400", dot: "bg-amber-400" },
  };

  // Auto-scan ports on page load
  useEffect(() => {
    if (ports.length > 0) {
      ports.forEach((p) => {
        if (p.enabled) {
          checkPortLive(p.id, p.targetHost, p.port);
        }
      });
    }
  }, []);

  // Sync input with running proxy port
  useEffect(() => {
    if (proxyRunningPort !== null) {
      setProxyPortInput(proxyRunningPort);
    }
  }, [proxyRunningPort]);

  // Port CRUD Handlers
  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (rule: PortRule) => {
    setFormMode("edit");
    setEditTarget(rule);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePort(deleteTarget.id);
    toast.success(t("hostDeletedToast", { domain: deleteTarget.domain }));
    setDeleteTarget(undefined);
  };

  const handleOpen = async (port: PortRule) => {
    const url = `${port.protocol}://${port.targetHost}:${port.port}`;
    toast.info(`Opening ${url}`, { description: `→ ${port.domain}` });
    try {
      await invoke("open_in_browser", { url });
    } catch (e) {
      console.error("Failed to open browser URL:", e);
    }
  };

  const checkAll = async () => {
    const enabledPorts = ports.filter((p) => p.enabled);
    if (enabledPorts.length === 0) {
      toast.info(t("noActivePortsToCheck"));
      return;
    }
    
    toast.promise(
      Promise.all(enabledPorts.map((p) => checkPortLive(p.id, p.targetHost, p.port))),
      {
        loading: t("scanningPorts"),
        success: () => {
          const live = ports.filter((p) => p.status === "running").length;
          return t("portScanCompletedWithCount", { count: live });
        },
        error: t("portScanFailed"),
      }
    );
  };

  // Proxy Control Handlers
  const handleToggleProxy = async () => {
    if (proxyRunningPort !== null) {
      try {
        await stopProxyServer();
        toast.success(t("proxyStopSuccess"));
      } catch (e) {
        toast.error(`Failed to stop proxy: ${e}`);
      }
    } else {
      if (proxyPortInput <= 0 || proxyPortInput > 65535) {
        toast.error("Invalid port number");
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

  // Proxy Rules CRUD Handlers
  const openProxyCreate = () => {
    setProxyFormMode("create");
    setProxyEditTarget(undefined);
    setProxyFormOpen(true);
  };

  const openProxyEdit = (rule: ProxyRule) => {
    setProxyFormMode("edit");
    setProxyEditTarget(rule);
    setProxyFormOpen(true);
  };

  const handleProxyDelete = () => {
    if (!proxyDeleteTarget) return;
    deleteProxyRule(proxyDeleteTarget.id);
    toast.success(t("proxyRuleDeleted", { domain: proxyDeleteTarget.domain }));
    setProxyDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("portsAndProxy")}
        subtitle={
          activeTab === "ports"
            ? `${runningPorts} ${t("running")} · ${t("portsSubtitle")}`
            : `${runningProxyRules} ${t("proxyRulesActive")} · ${
                proxyRunningPort !== null
                  ? t("proxyRunningDesc", { port: proxyRunningPort })
                  : t("proxyStoppedDesc")
              }`
        }
        actions={
          <div className="flex items-center gap-2">
            {activeTab === "ports" ? (
              <>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 cursor-pointer" onClick={checkAll}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("checkAll")}
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs cursor-pointer"
                  onClick={openCreate}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("addPort")}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs cursor-pointer"
                onClick={openProxyCreate}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addProxyRule")}
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tabs switcher List */}
        <div className="border-b border-border bg-card px-6 py-2">
          <TabsList variant="line" className="h-8 p-0">
            <TabsTrigger value="ports" className="text-xs font-semibold px-4 cursor-pointer">
              {t("portChecker")}
            </TabsTrigger>
            <TabsTrigger value="proxy" className="text-xs font-semibold px-4 cursor-pointer gap-1.5 flex items-center">
              {t("reverseProxy")}
              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 text-[9px] px-1 py-0 font-normal rounded-md">
                Experimental
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <TabsContent value="ports" className="m-0 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {(["running", "stopped", "unknown"] as const).map((status) => {
                const count = ports.filter((p) => p.status === status).length;
                const cfg = statusConfig[status];
                return (
                  <div key={status} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <div>
                      <p className="text-base font-bold leading-none">{count}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Port rules list */}
            <div className="space-y-2">
              {ports.map((port) => {
                const cfg = statusConfig[port.status];
                const target = `${port.protocol}://${port.targetHost}:${port.port}`;
                return (
                  <div
                    key={port.id}
                    className={`rounded-xl border border-border bg-card p-4 flex items-center justify-between hover:border-border/60 transition-colors group ${!port.enabled ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={port.enabled}
                        onCheckedChange={() => {
                          updatePort(port.id, { enabled: !port.enabled });
                          toast.success(
                            t("portRuleToggleSuccess", {
                              status: !port.enabled ? t("statusEnabled") : t("statusDisabled"),
                            })
                          );
                          if (!port.enabled) {
                            checkPortLive(port.id, port.targetHost, port.port);
                          }
                        }}
                        className="scale-90"
                      />
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                        <Plug className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-xs">{port.domain}</span>
                          <span className="text-muted-foreground text-[10px]">→</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{target}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="border-0 bg-slate-500/10 text-slate-400 text-[9px] px-1.5 py-0">:{port.port}</Badge>
                          <Badge className="border-0 bg-sky-500/10 text-sky-400 text-[9px] px-1.5 py-0 uppercase">{port.protocol}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`border-0 text-[9px] px-1.5 py-0 ${cfg.className}`}>
                        <span className={`w-1 h-1 rounded-full mr-1 inline-block ${cfg.dot}`} />
                        {cfg.label}
                      </Badge>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1 text-indigo-400 border-indigo-400/20 hover:bg-indigo-500/5 cursor-pointer"
                          disabled={!port.enabled}
                          onClick={() => handleOpen(port)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {t("openInBrowser")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => openEdit(port)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => setDeleteTarget(port)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {ports.length === 0 && (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
                  <Plug className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">{t("noData")}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="proxy" className="m-0 space-y-4">
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
                    <h3 className="text-sm font-semibold">
                      {t("proxyServerEngine")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {proxyRunningPort !== null
                        ? t("proxyRunningDesc", { port: proxyRunningPort })
                        : t("proxyStoppedDesc")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="proxyPort" className="text-xs text-muted-foreground font-mono">Port:</Label>
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

            {/* Proxy rules list */}
            <div className="space-y-2">
              {proxyRules.map((rule) => {
                return (
                  <div
                    key={rule.id}
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
                            {rule.targetType === "local" ? "Local Port" : "External Proxy"}
                          </Badge>
                          {rule.targetType === "external" && rule.customResolver && (
                            <Badge className="border-0 bg-slate-500/10 text-slate-400 text-[9px] px-1.5 py-0 font-mono">
                              DNS: {rule.customResolver}
                            </Badge>
                          )}
                          {rule.isRegex && (
                            <Badge className="border-0 bg-yellow-500/10 text-yellow-400 text-[9px] px-1.5 py-0 font-mono">
                              Regex
                            </Badge>
                          )}
                          {rule.stripPrefix && (
                            <Badge className="border-0 bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0 font-mono">
                              Strip Prefix
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
                        onClick={() => openProxyEdit(rule)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() => setProxyDeleteTarget(rule)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {proxyRules.length === 0 && (
                <div className="text-center py-16 text-muted-foreground bg-card rounded-xl border border-border">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">{t("noProxyRules")}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <PortFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        rule={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? "Port rule added" : "Port rule updated")
        }
      />

      <ProxyFormDialog
        open={proxyFormOpen}
        onOpenChange={setProxyFormOpen}
        mode={proxyFormMode}
        rule={proxyEditTarget}
        onSave={() =>
          toast.success(proxyFormMode === "create" ? t("proxyRuleCreated") : t("proxyRuleUpdated"))
        }
      />

      {/* Port Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent className="bg-card text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePortConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deletePortText")} (<code className="font-mono">{deleteTarget?.domain}</code>)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Proxy Delete Confirmation */}
      <AlertDialog open={!!proxyDeleteTarget} onOpenChange={(o) => !o && setProxyDeleteTarget(undefined)}>
        <AlertDialogContent className="bg-card text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteProxyRuleConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProxyRuleText")}{" "}
              (<code className="font-mono">{proxyDeleteTarget?.domain}</code>)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProxyDelete}
              className="bg-red-600 hover:bg-red-700 text-white animate-fade-in"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
