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
import { useAppStore, type HostGroup } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { getGroupSchema } from "@/lib/schemas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  group?: HostGroup;
  onSave?: () => void;
};

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
  "#84cc16", "#f97316",
];

const DEFAULT_FORM = { name: "", description: "", color: PRESET_COLORS[0] };

export function GroupFormDialog({ open, onOpenChange, mode, group, onSave }: Props) {
  const { addGroup, updateGroup } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && group) {
        setForm({ name: group.name, description: group.description ?? "", color: group.color });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, mode, group]);

  const validate = () => {
    const schema = getGroupSchema(t);
    const result = schema.safeParse({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      color: form.color,
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

    if (mode === "create") {
      addGroup({ name: form.name.trim(), description: form.description.trim() || undefined, color: form.color });
    } else if (group) {
      updateGroup(group.id, { name: form.name.trim(), description: form.description.trim() || undefined, color: form.color });
    }
    onSave?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addGroup") : t("editGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">{t("groupName")} *</Label>
            <Input
              id="group-name"
              placeholder={t("namePlaceholder")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-desc">{t("description")}</Label>
            <Input
              id="group-desc"
              placeholder={t("descPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("groupColor")}</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? "white" : "transparent",
                  }}
                />
              ))}
            </div>
            {/* Preview swatch */}
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-4 h-4 rounded-full border border-white/10"
                style={{ backgroundColor: form.color }}
              />
              <span className="text-xs font-mono text-muted-foreground">{form.color}</span>
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
