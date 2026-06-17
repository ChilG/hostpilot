import { useState, useEffect } from "react";
import { useAppStore, type ProxyRule } from "@/store/AppStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/translations";

interface ProxyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  rule?: ProxyRule;
  onSave?: () => void;
}

export function ProxyFormDialog({
  open,
  onOpenChange,
  mode,
  rule,
  onSave,
}: ProxyFormDialogProps) {
  const { addProxyRule, updateProxyRule, proxyRules } = useAppStore();
  const { t } = useTranslation();

  const [domain, setDomain] = useState("");
  const [pathPrefix, setPathPrefix] = useState("/");
  const [targetType, setTargetType] = useState<"local" | "external">("local");
  const [targetAddress, setTargetAddress] = useState("");
  const [customResolver, setCustomResolver] = useState("8.8.8.8");
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && rule) {
        setDomain(rule.domain);
        setPathPrefix(rule.pathPrefix);
        setTargetType(rule.targetType);
        setTargetAddress(rule.targetAddress);
        setCustomResolver(rule.customResolver || "8.8.8.8");
        setEnabled(rule.enabled);
      } else {
        setDomain("");
        setPathPrefix("/");
        setTargetType("local");
        setTargetAddress("");
        setCustomResolver("8.8.8.8");
        setEnabled(true);
      }
      setErrors({});
    }
  }, [open, mode, rule]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!domain.trim()) {
      newErrors.domain = t("validation.domainRequired");
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      newErrors.domain = t("validation.invalidDomain");
    }

    if (!pathPrefix.trim() || !pathPrefix.startsWith("/")) {
      newErrors.pathPrefix = t("locale") === "th" ? "Path ต้องขึ้นต้นด้วย /" : "Path must start with /"; // Keeping custom simple inline for path specific if needed, or add to dictionary
    }

    if (!targetAddress.trim()) {
      newErrors.targetAddress = t("locale") === "th" ? "กรุณากรอกเป้าหมาย" : "Target address is required";
    } else if (targetType === "local" && !/^(http|https):\/\//.test(targetAddress)) {
      newErrors.targetAddress = t("locale") === "th" ? "ต้องระบุ http:// หรือ https://" : "Must start with http:// or https://";
    }

    if (targetType === "external" && customResolver) {
      const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipPattern.test(customResolver)) {
        newErrors.customResolver = t("locale") === "th" ? "IP DNS ไม่ถูกต้อง" : "Invalid DNS IP address";
      }
    }

    // Check duplicate prefix for the same domain
    const isDuplicate = proxyRules.some(
      (r) =>
        r.id !== rule?.id &&
        r.domain.toLowerCase() === domain.toLowerCase() &&
        r.pathPrefix.toLowerCase() === pathPrefix.toLowerCase()
    );
    if (isDuplicate) {
      newErrors.pathPrefix = t("locale") === "th" ? "Path นี้ถูกใช้ไปแล้วสำหรับโดเมนนี้" : "Path prefix already exists for this domain";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const payload = {
      domain: domain.trim(),
      pathPrefix: pathPrefix.trim(),
      targetType,
      targetAddress: targetAddress.trim(),
      customResolver: targetType === "external" ? customResolver.trim() : undefined,
      enabled,
    };

    if (mode === "create") {
      addProxyRule(payload);
    } else if (mode === "edit" && rule) {
      updateProxyRule(rule.id, payload);
    }

    if (onSave) onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-foreground border-border">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("addProxyRule") : t("editProxyRule")}
          </DialogTitle>
          <DialogDescription>
            {t("proxyFormDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Domain */}
          <div className="space-y-1">
            <Label htmlFor="domain">{t("domain")}</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="myweb.com"
              className={errors.domain ? "border-red-500" : ""}
            />
            {errors.domain && <p className="text-xs text-red-500">{errors.domain}</p>}
          </div>

          {/* Path Prefix */}
          <div className="space-y-1">
            <Label htmlFor="pathPrefix">Path Prefix</Label>
            <Input
              id="pathPrefix"
              value={pathPrefix}
              onChange={(e) => setPathPrefix(e.target.value)}
              placeholder="/api"
              className={errors.pathPrefix ? "border-red-500" : ""}
            />
            {errors.pathPrefix && <p className="text-xs text-red-500">{errors.pathPrefix}</p>}
          </div>

          {/* Target Type */}
          <div className="space-y-1">
            <Label htmlFor="targetType">{t("targetType")}</Label>
            <Select
              value={targetType}
              onValueChange={(val) => {
                setTargetType(val as any);
                if (val === "external" && !targetAddress.startsWith("http")) {
                  setTargetAddress("https://" + domain);
                }
              }}
            >
              <SelectTrigger id="targetType" className="w-full bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local Dev Server (เช่น localhost:3000)</SelectItem>
                <SelectItem value="external">External Production Server (เช่น https://myweb.com)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Address */}
          <div className="space-y-1">
            <Label htmlFor="targetAddress">{t("targetAddress")}</Label>
            <Input
              id="targetAddress"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder={targetType === "local" ? "http://127.0.0.1:3000" : "https://myweb.com"}
              className={errors.targetAddress ? "border-red-500" : ""}
            />
            {errors.targetAddress && <p className="text-xs text-red-500">{errors.targetAddress}</p>}
          </div>

          {/* DNS Override Resolver */}
          {targetType === "external" && (
            <div className="space-y-1">
              <Label htmlFor="customResolver">{t("dnsOverrideResolver")}</Label>
              <Input
                id="customResolver"
                value={customResolver}
                onChange={(e) => setCustomResolver(e.target.value)}
                placeholder="8.8.8.8"
                className={errors.customResolver ? "border-red-500" : ""}
              />
              {errors.customResolver && <p className="text-xs text-red-500">{errors.customResolver}</p>}
            </div>
          )}

          {/* Enabled Switch */}
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="enabled-switch">{t("enableRule")}</Label>
            <Switch
              id="enabled-switch"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
