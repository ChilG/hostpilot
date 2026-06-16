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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  profile?: HostProfile;
  onSave?: () => void;
};

const DEFAULT_FORM = { name: "", description: "", entryIds: [] as string[] };

export function ProfileFormDialog({ open, onOpenChange, mode, profile, onSave }: Props) {
  const { hosts, groups, addProfile, updateProfile } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && profile) {
        setForm({ name: profile.name, description: profile.description ?? "", entryIds: profile.entryIds });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
      setSearchTerm("");
    }
  }, [open, mode, profile]);

  const toggleEntry = (id: string) =>
    setForm((f) => ({
      ...f,
      entryIds: f.entryIds.includes(id)
        ? f.entryIds.filter((e) => e !== id)
        : [...f.entryIds, id],
    }));

  const toggleGroup = (groupId: string | null, selectAll: boolean) => {
    const targetHosts = hosts.filter((h) => (groupId ? h.groupId === groupId : !h.groupId));
    const targetIds = targetHosts.map((h) => h.id);

    setForm((f) => {
      if (selectAll) {
        const newEntryIds = [...f.entryIds];
        targetIds.forEach((id) => {
          if (!newEntryIds.includes(id)) {
            newEntryIds.push(id);
          }
        });
        return { ...f, entryIds: newEntryIds };
      } else {
        return {
          ...f,
          entryIds: f.entryIds.filter((id) => !targetIds.includes(id)),
        };
      }
    });
  };

  const isGroupAllSelected = (groupHosts: any[]) => {
    return groupHosts.length > 0 && groupHosts.every((h) => form.entryIds.includes(h.id));
  };

  const isGroupSomeSelected = (groupHosts: any[]) => {
    const selectedCount = groupHosts.filter((h) => form.entryIds.includes(h.id)).length;
    return selectedCount > 0 && selectedCount < groupHosts.length;
  };

  const validate = () => {
    const schema = getProfileSchema(t);
    const result = schema.safeParse({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      entryIds: form.entryIds,
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

  const filteredHosts = hosts.filter((h) =>
    h.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedHosts = groups
    .map((g) => {
      const groupHosts = filteredHosts.filter((h) => h.groupId === g.id);
      return {
        group: g,
        hosts: groupHosts,
      };
    })
    .filter((gh) => gh.hosts.length > 0);

  const unassignedHosts = filteredHosts.filter((h) => !h.groupId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark">
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
            <Label>
              {t("selectHosts")} ({t("hostsSelectedText", { count: form.entryIds.length })})
            </Label>
            
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder={t("searchHosts")}
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

            <div className="max-h-60 overflow-y-auto space-y-3 rounded-lg border border-border p-2 bg-muted/20">
              {filteredHosts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {hosts.length === 0 ? t("noHostsYetMessage") : t("noData")}
                </p>
              )}

              {groupedHosts.map(({ group, hosts: groupHosts }) => {
                const allSelected = isGroupAllSelected(groupHosts);
                const someSelected = isGroupSomeSelected(groupHosts);

                return (
                  <div key={group.id} className="space-y-1">
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/40 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="font-medium text-foreground">{group.name}</span>
                        <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded text-muted-foreground">
                          {t("hostsCountText", { count: groupHosts.length })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id, !allSelected)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          allSelected ? "bg-indigo-600 border-indigo-600" : someSelected ? "bg-indigo-600/40 border-indigo-500" : "border-muted-foreground/40"
                        }`}>
                          {allSelected && (
                            <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {!allSelected && someSelected && (
                            <div className="w-1.5 h-0.5 bg-white rounded-sm" />
                          )}
                        </div>
                        <span>
                          {allSelected
                            ? t("locale") === "th"
                              ? "ยกเลิกกลุ่ม"
                              : "Deselect Group"
                            : t("locale") === "th"
                            ? "เลือกทั้งกลุ่ม"
                            : "Select Group"}
                        </span>
                      </button>
                    </div>

                    {/* Group Hosts */}
                    <div className="pl-2 space-y-0.5">
                      {groupHosts.map((h) => {
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
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                              selected ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/30"
                            }`}>
                              {selected && (
                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
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
                      onClick={() => toggleGroup(null, !isGroupAllSelected(unassignedHosts))}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium flex items-center gap-1"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isGroupAllSelected(unassignedHosts) ? "bg-indigo-600 border-indigo-600" : isGroupSomeSelected(unassignedHosts) ? "bg-indigo-600/40 border-indigo-500" : "border-muted-foreground/40"
                      }`}>
                        {isGroupAllSelected(unassignedHosts) && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {!isGroupAllSelected(unassignedHosts) && isGroupSomeSelected(unassignedHosts) && (
                          <div className="w-1.5 h-0.5 bg-white rounded-sm" />
                        )}
                      </div>
                      <span>
                        {isGroupAllSelected(unassignedHosts)
                          ? t("locale") === "th"
                            ? "ยกเลิกกลุ่ม"
                            : "Deselect Group"
                          : t("locale") === "th"
                          ? "เลือกทั้งกลุ่ม"
                          : "Select Group"}
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
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            selected ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/30"
                          }`}>
                            {selected && (
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
