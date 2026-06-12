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
import { useAppStore, type PortRule } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rule?: PortRule;
  onSave?: () => void;
};

const DEFAULT_FORM = {
  domain: "",
  targetHost: "127.0.0.1",
  port: "",
  protocol: "http" as PortRule["protocol"],
  enabled: true,
  status: "unknown" as PortRule["status"],
};

export function PortFormDialog({ open, onOpenChange, mode, rule, onSave }: Props) {
  const { hosts, addPort, updatePort } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && rule) {
        setForm({
          domain: rule.domain,
          targetHost: rule.targetHost,
          port: String(rule.port),
          protocol: rule.protocol,
          enabled: rule.enabled,
          status: rule.status,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, mode, rule]);

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!form.domain.trim()) {
      e.domain = t("locale") === "th" ? "กรุณากรอกชื่อโดเมน" : "Domain is required";
    }
    if (!form.port) {
      e.port = t("locale") === "th" ? "กรุณากรอกหมายเลขพอร์ต" : "Port is required";
    } else if (isNaN(Number(form.port)) || Number(form.port) < 1 || Number(form.port) > 65535) {
      e.port = t("locale") === "th" ? "หมายเลขพอร์ตต้องเป็นตัวเลข 1–65535" : "Port must be 1–65535";
    }
    
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const payload = {
      domain: form.domain.trim(),
      targetHost: form.targetHost.trim(),
      port: Number(form.port),
      protocol: form.protocol,
      enabled: form.enabled,
      status: form.status,
    };

    if (mode === "create") {
      addPort(payload);
    } else if (rule) {
      updatePort(rule.id, payload);
    }
    onSave?.();
    onOpenChange(false);
  };

  const hostDomains = hosts.map((h) => h.domain);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm dark">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addPort") : t("editPort")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="port-domain">{t("domain")} *</Label>
            <Select
              value={form.domain || "custom"}
              onValueChange={(v) => setForm((f) => ({ ...f, domain: v === "custom" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("locale") === "th" ? "เลือกโดเมน" : "Select domain"} />
              </SelectTrigger>
              <SelectContent>
                {hostDomains.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
                <SelectItem value="custom">{t("locale") === "th" ? "กำหนดเอง..." : "Custom..."}</SelectItem>
              </SelectContent>
            </Select>
            {(!hostDomains.includes(form.domain) || form.domain === "") && (
              <Input
                id="port-domain"
                placeholder={t("domainPlaceholder")}
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                className={errors.domain ? "border-red-500" : ""}
              />
            )}
            {errors.domain && <p className="text-xs text-red-400">{errors.domain}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="port-protocol">{t("protocol")}</Label>
              <Select
                value={form.protocol}
                onValueChange={(v) => setForm((f) => ({ ...f, protocol: v as PortRule["protocol"] }))}
              >
                <SelectTrigger id="port-protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">http</SelectItem>
                  <SelectItem value="https">https</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="port-num">{t("portNumber")} *</Label>
              <Input
                id="port-num"
                type="number"
                placeholder={t("portPlaceholder")}
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                className={errors.port ? "border-red-500" : ""}
              />
              {errors.port && <p className="text-xs text-red-400">{errors.port}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="port-target">{t("targetHost")}</Label>
            <Input
              id="port-target"
              placeholder={t("targetHostPlaceholder")}
              value={form.targetHost}
              onChange={(e) => setForm((f) => ({ ...f, targetHost: e.target.value }))}
            />
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
