import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore, type HostProfile } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { getProfileSchema } from "@/lib/schemas";
import { Search, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CheckIconProps {
  checked: boolean;
  indeterminate?: boolean;
  size?: "sm" | "md";
}

function CheckIcon({ checked, indeterminate = false, size = "sm" }: CheckIconProps) {
  const dim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div
      className={`${dim} rounded border flex items-center justify-center transition-colors ${
        checked || indeterminate
          ? "bg-indigo-600 border-indigo-600"
          : "border-muted-foreground/30 bg-background"
      }`}
    >
      {checked && (
        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {!checked && indeterminate && (
        <div className="w-1.5 h-0.5 bg-white rounded-sm" />
      )}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  profile?: HostProfile;
  onSave?: () => void;
};

type FormState = {
  name: string;
  description: string;
  entryIds: string[];
  groupIds: string[];
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  entryIds: [],
  groupIds: [],
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfileFormDialog({ open, onOpenChange, mode, profile, onSave }: Props) {
  const { hosts, groups, addProfile, updateProfile } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"groups" | "hosts">("groups");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && profile) {
        setForm({
          name: profile.name,
          description: profile.description ?? "",
          entryIds: profile.entryIds || [],
          groupIds: profile.groupIds || [],
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
      setSearchTerm("");
      setActiveTab("groups");
    }
  }, [open, mode, profile]);

  // ─── Toggle Handlers ────────────────────────────────────────────────────

  /**
   * Toggle a specific host individually.
   * If the host's group is currently selected, deselect the group and
   * individually select all *other* hosts in that group instead.
   * If all hosts in the group are now individually selected, auto-promote to group selection.
   */
  const toggleEntry = (hostId: string, groupId?: string) => {
    setForm((f) => {
      // If the host's group is currently selected via group toggle — break out of group selection
      if (groupId && f.groupIds.includes(groupId)) {
        const groupHosts = hosts.filter((h) => h.groupId === groupId);
        const otherHostIds = groupHosts.map((h) => h.id).filter((id) => id !== hostId);
        return {
          ...f,
          groupIds: f.groupIds.filter((id) => id !== groupId),
          entryIds: Array.from(new Set([...f.entryIds, ...otherHostIds])),
        };
      }

      // Standard individual toggle
      const isSelected = f.entryIds.includes(hostId);
      const nextEntryIds = isSelected
        ? f.entryIds.filter((id) => id !== hostId)
        : [...f.entryIds, hostId];

      // Auto-promote to group selection if all hosts in this group are now individually selected
      if (groupId) {
        const groupHostIds = hosts.filter((h) => h.groupId === groupId).map((h) => h.id);
        if (groupHostIds.length > 0 && groupHostIds.every((id) => nextEntryIds.includes(id))) {
          return {
            ...f,
            groupIds: [...f.groupIds, groupId],
            entryIds: nextEntryIds.filter((id) => !groupHostIds.includes(id)),
          };
        }
      }

      return { ...f, entryIds: nextEntryIds };
    });
  };

  /**
   * Toggle an entire group on or off.
   * When deselecting, also removes all individual host overrides for that group.
   * When called with groupId=null, toggles the "unassigned" (no-group) hosts.
   */
  const handleGroupToggle = (groupId: string | null, forceSelect?: boolean) => {
    if (groupId) {
      setForm((f) => {
        const isSelected = forceSelect !== undefined ? !forceSelect : f.groupIds.includes(groupId);
        const nextGroupIds = isSelected
          ? f.groupIds.filter((id) => id !== groupId)
          : Array.from(new Set([...f.groupIds, groupId]));

        // Always clean up individual host overrides for this group
        const groupHostIds = hosts.filter((h) => h.groupId === groupId).map((h) => h.id);
        const nextEntryIds = f.entryIds.filter((id) => !groupHostIds.includes(id));

        return { ...f, groupIds: nextGroupIds, entryIds: nextEntryIds };
      });
    } else {
      // Handle unassigned (no-group) hosts
      const targetIds = hosts.filter((h) => !h.groupId).map((h) => h.id);
      setForm((f) => {
        const allSelected = targetIds.every((id) => f.entryIds.includes(id));
        if (allSelected) {
          return { ...f, entryIds: f.entryIds.filter((id) => !targetIds.includes(id)) };
        }
        const newEntryIds = Array.from(new Set([...f.entryIds, ...targetIds]));
        return { ...f, entryIds: newEntryIds };
      });
    }
  };

  // ─── Selection State Helpers ────────────────────────────────────────────

  const isGroupAllSelected = (groupHosts: { id: string }[]) =>
    groupHosts.length > 0 && groupHosts.every((h) => form.entryIds.includes(h.id));

  const isGroupSomeSelected = (groupHosts: { id: string }[]) => {
    const count = groupHosts.filter((h) => form.entryIds.includes(h.id)).length;
    return count > 0 && count < groupHosts.length;
  };

  // ─── Validation & Save ──────────────────────────────────────────────────

  const validate = () => {
    const schema = getProfileSchema(t);
    const result = schema.safeParse({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      entryIds: form.entryIds,
      groupIds: form.groupIds,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      return fieldErrors;
    }
    return {};
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      entryIds: form.entryIds,
      groupIds: form.groupIds,
      active: false,
      favorite: false,
    };

    if (mode === "create") {
      addProfile(payload);
    } else if (profile) {
      updateProfile(profile.id, payload);
    }
    onSave?.();
    onOpenChange(false);
  };

  // ─── Derived Data ────────────────────────────────────────────────────────

  const filteredHosts = hosts.filter((h) =>
    h.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedHosts = groups
    .map((g) => ({ group: g, hosts: filteredHosts.filter((h) => h.groupId === g.id) }))
    .filter((gh) => gh.hosts.length > 0);

  const unassignedHosts = filteredHosts.filter((h) => !h.groupId);

  const getHostsInGroupCount = (groupId: string) =>
    hosts.filter((h) => h.groupId === groupId).length;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addProfile") : t("editProfile")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="prof-name">{t("profileName")} *</Label>
            <Input
              id="prof-name"
              placeholder={t("profileNamePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-desc">{t("description")}</Label>
            <Input
              id="prof-desc"
              placeholder={t("descPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("selectHosts")}</Label>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder={activeTab === "groups" ? t("searchGroups") || "Search groups..." : t("searchHosts")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8 bg-muted/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as "groups" | "hosts"); setSearchTerm(""); }} className="w-full">
              <TabsList className="grid grid-cols-2 mb-3 h-8 p-0.5 bg-muted/30">
                <TabsTrigger value="groups" className="text-xs py-1">
                  {t("selectGroupsTab")} ({form.groupIds.length})
                </TabsTrigger>
                <TabsTrigger value="hosts" className="text-xs py-1">
                  {t("selectHostsTab")} ({form.entryIds.length})
                </TabsTrigger>
              </TabsList>

              {/* ── Groups Tab ── */}
              <TabsContent value="groups" className="mt-0">
                <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-muted/20">
                  {filteredGroups.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {groups.length === 0 ? t("noGroupsYet") || "No groups found." : t("noData")}
                    </p>
                  )}

                  {filteredGroups.map((g) => {
                    const isSelected = form.groupIds.includes(g.id);
                    const hostCount = getHostsInGroupCount(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleGroupToggle(g.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-medium"
                            : "hover:bg-accent/30 border-transparent text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-sm"
                            style={{ backgroundColor: g.color }}
                          />
                          <div className="text-left">
                            <span className="font-medium text-foreground text-xs block">{g.name}</span>
                            {g.description && (
                              <span className="text-[10px] text-muted-foreground block line-clamp-1">{g.description}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] bg-accent/60 px-2 py-0.5 rounded text-muted-foreground font-semibold">
                            {t("hostsCountText", { count: hostCount })}
                          </span>
                          <CheckIcon checked={isSelected} size="md" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ── Hosts Tab ── */}
              <TabsContent value="hosts" className="mt-0">
                <div className="max-h-60 overflow-y-auto space-y-3 rounded-lg border border-border p-2 bg-muted/20">
                  {filteredHosts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {hosts.length === 0 ? t("noHostsYetMessage") : t("noData")}
                    </p>
                  )}

                  {groupedHosts.map(({ group, hosts: groupHosts }) => {
                    const isGroupSelected = form.groupIds.includes(group.id);

                    return (
                      <div key={group.id} className="space-y-1">
                        {/* Group Header */}
                        <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/40 text-xs font-semibold text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                            <span className="font-medium text-foreground">{group.name}</span>
                            <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-muted-foreground">
                              {t("hostsCountText", { count: groupHosts.length })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleGroupToggle(group.id, isGroupSelected)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
                          >
                            <CheckIcon checked={isGroupSelected} />
                            <span>{isGroupSelected ? t("deselectGroupAll") : t("selectGroupAll")}</span>
                          </button>
                        </div>

                        {/* Group Hosts */}
                        <div className="pl-2 space-y-0.5">
                          {groupHosts.map((h) => {
                            const selectedDirectly = form.entryIds.includes(h.id);
                            const selectedViaGroup = isGroupSelected;
                            const isChecked = selectedDirectly || selectedViaGroup;

                            return (
                              <button
                                key={h.id}
                                type="button"
                                onClick={() => toggleEntry(h.id, group.id)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                                  isChecked
                                    ? "bg-indigo-500/10 text-indigo-300 font-medium"
                                    : "hover:bg-accent/30 text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs">{h.domain}</span>
                                  {selectedViaGroup && (
                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 rounded font-normal scale-90">
                                      {t("groupSelectedText") || "via Group"}
                                    </span>
                                  )}
                                </div>
                                <CheckIcon checked={isChecked} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {unassignedHosts.length > 0 && (
                    <div className="space-y-1">
                      {/* Unassigned Header */}
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/40 text-xs font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                          <span className="font-medium text-foreground">{t("noGroup")}</span>
                          <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-muted-foreground">
                            {t("hostsCountText", { count: unassignedHosts.length })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(null)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
                        >
                          <CheckIcon
                            checked={isGroupAllSelected(unassignedHosts)}
                            indeterminate={isGroupSomeSelected(unassignedHosts)}
                          />
                          <span>
                            {isGroupAllSelected(unassignedHosts)
                              ? t("deselectGroupAll")
                              : t("selectGroupAll")}
                          </span>
                        </button>
                      </div>

                      {/* Unassigned Hosts */}
                      <div className="pl-2 space-y-0.5">
                        {unassignedHosts.map((h) => {
                          const selected = form.entryIds.includes(h.id);
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => toggleEntry(h.id)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                                selected
                                  ? "bg-indigo-500/10 text-indigo-300 font-medium"
                                  : "hover:bg-accent/30 text-muted-foreground"
                              }`}
                            >
                              <span className="font-mono text-xs">{h.domain}</span>
                              <CheckIcon checked={selected} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSave}
          >
            {mode === "create" ? t("add") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
