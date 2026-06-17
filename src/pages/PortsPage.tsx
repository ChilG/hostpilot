import { useState, useEffect } from "react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Plus, RefreshCw } from "lucide-react";
import { PortCheckerTab } from "@/components/ports/PortCheckerTab";
import { ReverseProxyTab } from "@/components/ports/ReverseProxyTab";

export function PortsPage() {
  const {
    ports,
    deletePort,
    checkPortLive,
    proxyRules,
    proxyRunningPort,
    deleteProxyRule,
    checkCaStatus,
  } = useAppStore();

  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<string>("ports");

  // Ports dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<PortRule | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<PortRule | undefined>();

  // Proxy dialog states
  const [proxyFormOpen, setProxyFormOpen] = useState(false);
  const [proxyFormMode, setProxyFormMode] = useState<"create" | "edit">("create");
  const [proxyEditTarget, setProxyEditTarget] = useState<ProxyRule | undefined>();
  const [proxyDeleteTarget, setProxyDeleteTarget] = useState<ProxyRule | undefined>();

  const runningPorts = ports.filter((p) => p.status === "running").length;
  const runningProxyRules = proxyRules.filter((r) => r.enabled).length;

  // Auto-scan ports on page load
  useEffect(() => {
    if (ports.length > 0) {
      ports.forEach((p) => {
        if (p.enabled) {
          checkPortLive(p.id, p.targetHost, p.port);
        }
      });
    }
    checkCaStatus();
  }, []);

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
    toast.info(t("openingUrl", { url }), { description: t("toDomain", { domain: port.domain }) });
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                  onClick={checkAll}
                >
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

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden gap-0"
      >
        {/* Tabs switcher List */}
        <div className="border-b border-border bg-card px-6 py-2">
          <TabsList variant="line" className="h-8 p-0">
            <TabsTrigger value="ports" className="text-xs font-semibold px-4 cursor-pointer">
              {t("portChecker")}
            </TabsTrigger>
            <TabsTrigger
              value="proxy"
              className="text-xs font-semibold px-4 cursor-pointer gap-1.5 flex items-center"
            >
              {t("reverseProxy")}
              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 text-[9px] px-1 py-0 font-normal rounded-md">
                {t("experimental")}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <TabsContent value="ports" className="m-0 space-y-4">
            <PortCheckerTab
              onEditPort={openEdit}
              onDeletePort={setDeleteTarget}
              onOpenPort={handleOpen}
            />
          </TabsContent>

          <TabsContent value="proxy" className="m-0 space-y-4">
            <ReverseProxyTab onEditProxy={openProxyEdit} onDeleteProxy={setProxyDeleteTarget} />
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
          toast.success(formMode === "create" ? t("portRuleCreated") : t("portRuleUpdated"))
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
      <AlertDialog
        open={!!proxyDeleteTarget}
        onOpenChange={(o) => !o && setProxyDeleteTarget(undefined)}
      >
        <AlertDialogContent className="bg-card text-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProxyRuleConfirm")}</AlertDialogTitle>
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
