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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, type HostEntry } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { getHostSchema } from "@/lib/schemas";
import { Switch } from "@/components/ui/switch";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  host?: HostEntry;
  onSave?: () => void;
};

const DEFAULT_FORM = {
  domain: "",
  ip: "127.0.0.1",
  groupId: "",
  description: "",
  source: "manual" as HostEntry["source"],
  enabled: true,
  isDynamic: false,
  dynamicType: "url" as "url" | "script",
  dynamicValue: "",
  syncInterval: 300,
};

export function HostFormDialog({ open, onOpenChange, mode, host, onSave }: Props) {
  const { groups, addHost, updateHost } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && host) {
        setForm({
          domain: host.domain,
          ip: host.ip,
          groupId: host.groupId ?? "",
          description: host.description ?? "",
          source: host.source,
          enabled: host.enabled,
          isDynamic: host.isDynamic ?? false,
          dynamicType: host.dynamicType ?? "url",
          dynamicValue: host.dynamicValue ?? "",
          syncInterval: host.syncInterval ?? 300,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, mode, host]);

  const validate = () => {
    const schema = getHostSchema(t);
    const result = schema.safeParse({
      domain: form.domain.trim(),
      ip: form.ip.trim(),
      groupId: form.groupId || undefined,
      description: form.description.trim() || undefined,
    });

    const fieldErrors: Record<string, string> = {};
    if (!result.success) {
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
    }

    if (form.isDynamic) {
      const dynamicVal = form.dynamicValue.trim();
      if (!dynamicVal) {
        fieldErrors.dynamicValue = t("dynamicValueRequired");
      } else if (form.dynamicType === "url") {
        try {
          new URL(dynamicVal);
        } catch (_) {
          fieldErrors.dynamicValue = t("invalidUrlError");
        }
      }
    }

    return fieldErrors;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const payload = {
      domain: form.domain.trim(),
      ip: form.ip.trim(),
      groupId: form.groupId || undefined,
      description: form.description.trim() || undefined,
      source: form.source,
      enabled: form.enabled,
      isDynamic: form.isDynamic,
      dynamicType: form.isDynamic ? form.dynamicType : undefined,
      dynamicValue: form.isDynamic ? form.dynamicValue.trim() : undefined,
      syncInterval: form.isDynamic ? form.syncInterval : undefined,
    };

    if (mode === "create") {
      addHost(payload);
    } else if (host) {
      updateHost(host.id, payload);
    }
    onSave?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addHost") : t("editHost")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="host-domain">{t("domain")} *</Label>
            <Input
              id="host-domain"
              placeholder={t("domainPlaceholder")}
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value.toLowerCase() }))}
              className={errors.domain ? "border-red-500" : ""}
            />
            {errors.domain && <p className="text-xs text-red-400">{errors.domain}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="host-ip">{t("ipAddress")} *</Label>
            <Input
              id="host-ip"
              placeholder={t("ipPlaceholder")}
              value={form.ip}
              onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value.toLowerCase() }))}
              className={errors.ip ? "border-red-500" : ""}
            />
            {errors.ip && <p className="text-xs text-red-400">{errors.ip}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>{t("group")}</Label>
            <Select
              value={form.groupId || "none"}
              onValueChange={(v) => setForm((f) => ({ ...f, groupId: v === "none" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectGroup")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noGroup")}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="host-desc">{t("description")}</Label>
            <Input
              id="host-desc"
              placeholder={t("descPlaceholder")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Dynamic Host settings */}
          <div className="flex items-center justify-between border border-border rounded-lg p-3 bg-muted/20 my-2">
            <div className="space-y-0.5">
              <Label htmlFor="host-dynamic" className="text-sm font-medium cursor-pointer">{t("isDynamic")}</Label>
              <p className="text-[10px] text-muted-foreground font-light">{t("resolveDomainDynamically")}</p>
            </div>
            <Switch
              id="host-dynamic"
              checked={form.isDynamic}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isDynamic: checked }))}
              className="scale-90"
            />
          </div>

          {form.isDynamic && (
            <div className="space-y-4 pt-2 border-t border-border mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <Label>{t("dynamicType")}</Label>
                <Select
                  value={form.dynamicType}
                  onValueChange={(v: "url" | "script") => setForm((f) => ({ ...f, dynamicType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">{t("urlType")}</SelectItem>
                    <SelectItem value="script">{t("scriptType")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="host-dynamic-val">{t("dynamicValue")} *</Label>
                <Input
                  id="host-dynamic-val"
                  placeholder={form.dynamicType === "url" ? "https://example.com/redirect" : "echo mydomain.local"}
                  value={form.dynamicValue}
                  onChange={(e) => setForm((f) => ({ ...f, dynamicValue: e.target.value }))}
                  className={errors.dynamicValue ? "border-red-500 text-xs" : "text-xs"}
                />
                {errors.dynamicValue && <p className="text-xs text-red-400">{errors.dynamicValue}</p>}
                <p className="text-[10px] text-muted-foreground">
                  {form.dynamicType === "url"
                    ? t("dynamicHelpTextUrl")
                    : t("dynamicHelpTextScript")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>{t("syncInterval")}</Label>
                <Select
                  value={String(form.syncInterval)}
                  onValueChange={(v) => setForm((f) => ({ ...f, syncInterval: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{t("syncInterval30s")}</SelectItem>
                    <SelectItem value="60">{t("syncInterval1m")}</SelectItem>
                    <SelectItem value="300">{t("syncInterval5m")}</SelectItem>
                    <SelectItem value="900">{t("syncInterval15m")}</SelectItem>
                    <SelectItem value="3600">{t("syncInterval1h")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("cancel")}
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            onClick={handleSave}
          >
            {mode === "create" ? t("add") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
