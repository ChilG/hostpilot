import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAppStore, isTauri, type HostEntry } from "@/store/AppStore";
import { HostFormDialog } from "@/components/hosts/HostFormDialog";
import { apiAdapter } from "@/store/apiAdapter";
import { HostTableRow } from "@/components/hosts/HostTableRow";
import { LiveDiffPreview } from "@/components/dashboard/LiveDiffPreview";
import { useTranslation } from "@/i18n/translations";
import { Plus, Search, Filter, Globe, PowerOff, Check, Zap } from "lucide-react";

export function HostsPage() {
  const {
    hosts,
    groups,
    deleteHost,
    updateHost,
    disableAllHosts,
    enableAllHosts,
    toggleGroupHosts,
    profiles,
    settings,
    addBackup,
  } = useAppStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Apply changes state
  const [quickApplyConfirmOpen, setQuickApplyConfirmOpen] = useState(false);
  const [diff, setDiff] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const activeProfile = profiles.find((p) => p.active) ||
    profiles[0] || { name: "None", id: "", entryIds: [] };

  const hasPendingChanges = diff
    .split("\n")
    .some((line) => line.startsWith("+") || line.startsWith("-"));

  // Load live hosts diff
  useEffect(() => {
    async function loadDiff() {
      if (!activeProfile || !activeProfile.name || activeProfile.name === "None") {
        setDiff("");
        return;
      }
      try {
        const profileEntries = hosts.filter((h) =>
          activeProfile.entryIds?.includes(h.id)
        );
        if (isTauri) {
          const result = await invoke<string>("get_hosts_diff", {
            blockName: activeProfile.name,
            entries: profileEntries,
          });
          setDiff(result);
        } else {
          // Browser mock diff
          const mockLines = [
            `  # System hosts file mock preview`,
            `  127.0.0.1 localhost`,
            `- # >>> HostPilot START: old-block`,
            `- 127.0.0.1 old-domain.local`,
            `- # <<< HostPilot END: old-block`,
            `+ # >>> HostPilot START: ${activeProfile.name}`,
            ...profileEntries
              .filter((h) => h.enabled)
              .map((h) => `+ 127.0.0.1   ${h.domain}`),
            `+ # <<< HostPilot END: ${activeProfile.name}`,
          ];
          setDiff(mockLines.join("\n"));
        }
      } catch (err) {
        console.error("Failed to load diff:", err);
        setDiff(t("errorLoadingDiff", { error: String(err) }));
      }
    }
    loadDiff();
  }, [hosts, activeProfile, refreshTrigger]);

  const handleQuickApply = async () => {
    try {
      // Filter entries associated with the active profile
      const profileEntries = hosts.filter((h) =>
        activeProfile.entryIds?.includes(h.id)
      );

      // Validate before write if enabled
      if (settings.validateBeforeWrite) {
        const ipRegex = /^[0-9a-fA-F.:%]+$/;
        const domainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9.]*$/;
        for (const entry of profileEntries) {
          if (entry.enabled) {
            const ip = entry.ip.trim();
            const domain = entry.domain.trim();
            if (!ip) {
              throw new Error(t("ipCannotBeEmpty", { domain }));
            }
            if (!domain) {
              throw new Error(t("domainCannotBeEmpty"));
            }
            if (!ipRegex.test(ip)) {
              throw new Error(t("invalidIpFormat", { ip }));
            }
            if (!domainRegex.test(domain)) {
              throw new Error(t("invalidDomainFormat", { domain }));
            }
          }
        }
      }

      // Create backup first if enabled
      if (settings.backupBeforeWrite) {
        await addBackup(t("autoBackupBeforeApply", { name: activeProfile.name }));
      }

      // Write hosts block via Tauri command
      if (isTauri) {
        await invoke("write_hosts_block", {
          blockName: activeProfile.name,
          entries: profileEntries,
        });
      }

      setRefreshTrigger((prev) => prev + 1);

      if (settings.showApplyNotifications) {
        toast.success(t("applySuccess"), {
          description: t("applySuccessDetail", { name: activeProfile.name }),
        });
      }
    } catch (e) {
      console.error("Failed to apply configuration:", e);
      if (settings.showErrorAlerts) {
        toast.error(t("applyFailed"), {
          description: String(e),
        });
      }
    } finally {
      setQuickApplyConfirmOpen(false);
    }
  };

  const handleSync = async (host: HostEntry) => {
    const toastId = toast.loading(t("loading"));
    try {
      const resolvedDomain = await apiAdapter.resolveDynamicHost(
        host.dynamicType || "url",
        host.dynamicValue || ""
      );

      if (resolvedDomain) {
        updateHost(host.id, {
          domain: resolvedDomain,
          lastSynced: new Date().toISOString(),
        });

        // Auto-apply if it is in the active profile
        if (activeProfile && activeProfile.id && activeProfile.entryIds?.includes(host.id)) {
          const updatedHosts = useAppStore.getState().hosts;
          const profileEntries = updatedHosts.filter((h) =>
            activeProfile.entryIds?.includes(h.id)
          );

          if (isTauri) {
            await invoke("write_hosts_block", {
              blockName: activeProfile.name,
              entries: profileEntries,
            });
          }
        }

        toast.success(t("syncSuccess", { domain: resolvedDomain }), { id: toastId });
      } else {
        throw new Error("No domain returned");
      }
    } catch (e) {
      console.error("Manual sync failed:", e);
      toast.error(t("syncFailed", { error: String(e) }), { id: toastId });
    }
  };

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<HostEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<HostEntry | undefined>();
  
  // Dynamic Confirmation Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => () => {});

  const triggerDisableAll = () => {
    setConfirmTitle(t("disableAllConfirm"));
    setConfirmDescription(t("disableAllConfirmText"));
    setConfirmAction(() => () => {
      disableAllHosts();
      toast.success(t("allHostsDisabledToast"));
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const triggerEnableAll = () => {
    setConfirmTitle(t("enableAllConfirm"));
    setConfirmDescription(t("enableAllConfirmText"));
    setConfirmAction(() => () => {
      enableAllHosts();
      toast.success(t("allHostsEnabledToast"));
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const triggerDisableGroup = (groupId: string) => {
    const groupName = groups.find((g) => g.id === groupId)?.name || "";
    setConfirmTitle(t("disableGroupConfirm", { name: groupName }));
    setConfirmDescription(t("disableGroupConfirmText", { name: groupName }));
    setConfirmAction(() => () => {
      toggleGroupHosts(groupId, false);
      toast.success(t("groupHostsDisabledToast", { name: groupName }));
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const triggerEnableGroup = (groupId: string) => {
    const groupName = groups.find((g) => g.id === groupId)?.name || "";
    setConfirmTitle(t("enableGroupConfirm", { name: groupName }));
    setConfirmDescription(t("enableGroupConfirmText", { name: groupName }));
    setConfirmAction(() => () => {
      toggleGroupHosts(groupId, true);
      toast.success(t("groupHostsEnabledToast", { name: groupName }));
      setConfirmOpen(false);
    });
    setConfirmOpen(true);
  };

  const filtered = hosts.filter((h) => {
    const matchSearch =
      h.domain.toLowerCase().includes(search.toLowerCase()) ||
      h.ip.includes(search) ||
      (h.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup ? h.groupId === filterGroup : true;
    return matchSearch && matchGroup;
  });

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (host: HostEntry) => {
    setFormMode("edit");
    setEditTarget(host);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteHost(deleteTarget.id);
    toast.success(t("hostDeletedToast", { domain: deleteTarget.domain }));
    setDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title={t("hosts")}
        subtitle={`${hosts.filter((h) => h.enabled).length} ${t("active")} / ${hosts.length} ${t("hosts")}`}
        actions={
          <div className="flex items-center gap-2">
            {filterGroup ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-500/90 hover:text-emerald-500 gap-1.5 h-8 text-xs cursor-pointer"
                  onClick={() => triggerEnableGroup(filterGroup)}
                  disabled={!hosts.some((h) => h.groupId === filterGroup && !h.enabled)}
                >
                  <Check className="w-3.5 h-3.5" />
                  {t("enableAll")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive/90 hover:text-destructive gap-1.5 h-8 text-xs cursor-pointer"
                  onClick={() => triggerDisableGroup(filterGroup)}
                  disabled={!hosts.some((h) => h.groupId === filterGroup && h.enabled)}
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  {t("disableAll")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-500/90 hover:text-emerald-500 gap-1.5 h-8 text-xs cursor-pointer"
                  onClick={triggerEnableAll}
                  disabled={!hosts.some((h) => !h.enabled)}
                >
                  <Check className="w-3.5 h-3.5" />
                  {t("enableAll")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive/90 hover:text-destructive gap-1.5 h-8 text-xs cursor-pointer"
                  onClick={triggerDisableAll}
                  disabled={!hosts.some((h) => h.enabled)}
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  {t("disableAll")}
                </Button>
              </>
            )}
            <Button
              size="sm"
              className={`gap-1.5 h-8 text-xs relative overflow-hidden transition-all duration-300 cursor-pointer ${
                hasPendingChanges
                  ? "bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse-glow ring-1 ring-indigo-400/50"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
              onClick={() => {
                if (settings.previewBeforeApply) {
                  setQuickApplyConfirmOpen(true);
                } else {
                  handleQuickApply();
                }
              }}
              disabled={!activeProfile || activeProfile.name === "None"}
            >
              <Zap className="w-3.5 h-3.5" />
              {t("applyChanges")}
              {hasPendingChanges && (
                <span className="absolute top-0.5 right-0.5 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
              )}
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs cursor-pointer"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addHost")}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-background/60">
          <div className="relative flex-shrink-0 w-full max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-shrink-0">{t("group")}:</span>
            <button
              onClick={() => setFilterGroup(null)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                filterGroup === null
                  ? "bg-indigo-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t("all")}
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setFilterGroup(filterGroup === g.id ? null : g.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  filterGroup === g.id
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                style={filterGroup === g.id ? { backgroundColor: g.color } : {}}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background border-b border-border z-20">
              <TableRow>
                <TableHead className="sticky left-0 top-0 bg-background z-30 text-left text-xs text-muted-foreground font-medium px-6 py-3 w-10 border-r border-border">
                  {t("on")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("domain")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("ipAddress")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("group")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("source")}
                </TableHead>
                <TableHead className="text-left text-xs text-muted-foreground font-medium px-3 py-3">
                  {t("description")}
                </TableHead>
                <TableHead className="sticky right-0 top-0 bg-background z-30 text-right text-xs text-muted-foreground font-medium px-6 py-3 border-l border-border">
                  {t("actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    {t("noData")}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((host) => {
                const group = groups.find((g) => g.id === host.groupId);
                return (
                  <HostTableRow
                    key={host.id}
                    host={host}
                    group={group}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onGroupClick={(groupId) => setFilterGroup(filterGroup === groupId ? null : groupId)}
                    onSync={handleSync}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <HostFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        host={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? t("hostCreated") : t("hostUpdated"))
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteHostConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteHostText")} (<code className="font-mono">{deleteTarget?.domain}</code>)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmAction}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={quickApplyConfirmOpen} onOpenChange={setQuickApplyConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[550px] data-[size=default]:sm:max-w-[550px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("applyConfirmation")}</AlertDialogTitle>
            <AlertDialogDescription>{t("applyConfirmText")}</AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-2">
            <span className="text-xs font-semibold text-muted-foreground block mb-2">{t("hostsFilePreview")}</span>
            <LiveDiffPreview diff={diff} noHeader={true} maxHeight="max-h-[200px]" />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuickApply}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

