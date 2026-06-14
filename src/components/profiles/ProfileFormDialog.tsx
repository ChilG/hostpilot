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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  profile?: HostProfile;
  onSave?: () => void;
};

const DEFAULT_FORM = { name: "", description: "", entryIds: [] as string[] };

export function ProfileFormDialog({ open, onOpenChange, mode, profile, onSave }: Props) {
  const { hosts, addProfile, updateProfile } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && profile) {
        setForm({ name: profile.name, description: profile.description ?? "", entryIds: profile.entryIds });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, mode, profile]);

  const toggleEntry = (id: string) =>
    setForm((f) => ({
      ...f,
      entryIds: f.entryIds.includes(id)
        ? f.entryIds.filter((e) => e !== id)
        : [...f.entryIds, id],
    }));

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
            <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-muted/20">
              {hosts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {t("noHostsYetMessage")}
                </p>
              )}
              {hosts.map((h) => {
                const selected = form.entryIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleEntry(h.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                      selected
                        ? "bg-indigo-500/15 text-indigo-300 font-medium"
                        : "hover:bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono text-xs">{h.domain}</span>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selected ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/40"
                    }`}>
                      {selected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
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
