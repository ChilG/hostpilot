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
  const [stripPrefix, setStripPrefix] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
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
        setStripPrefix(rule.stripPrefix || false);
        setIsRegex(rule.isRegex || false);
      } else {
        setDomain("");
        setPathPrefix("/");
        setTargetType("local");
        setTargetAddress("");
        setCustomResolver("8.8.8.8");
        setEnabled(true);
        setStripPrefix(false);
        setIsRegex(false);
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

    if (!pathPrefix.trim()) {
      newErrors.pathPrefix = t("validation.pathRequired");
    } else if (!isRegex && !pathPrefix.startsWith("/")) {
      newErrors.pathPrefix = t("validation.pathMustStartWithSlash");
    } else if (isRegex) {
      try {
        new RegExp(pathPrefix);
      } catch (e) {
        newErrors.pathPrefix = t("invalidRegex");
      }
    }

    if (!targetAddress.trim()) {
      newErrors.targetAddress = t("validation.targetAddressRequired");
    } else if (targetType === "local" && !/^(http|https):\/\//.test(targetAddress)) {
      newErrors.targetAddress = t("validation.targetAddressScheme");
    }

    if (targetType === "external" && customResolver) {
      const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipPattern.test(customResolver)) {
        newErrors.customResolver = t("validation.resolverIpInvalid");
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
      newErrors.pathPrefix = t("validation.pathPrefixDuplicate");
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
      stripPrefix,
      isRegex,
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
                <SelectItem value="local">{t("localDevServer")}</SelectItem>
                <SelectItem value="external">{t("externalProdServer")}</SelectItem>
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

          {/* Regex Match Switch */}
          <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-1">
            <div className="space-y-0.5">
              <Label htmlFor="regex-switch">{t("isRegex")}</Label>
              <p className="text-[11px] text-muted-foreground">
                {t("isRegexDesc")}
              </p>
            </div>
            <Switch
              id="regex-switch"
              checked={isRegex}
              onCheckedChange={setIsRegex}
            />
          </div>

          {/* Strip Prefix Switch */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="strip-prefix-switch">{t("stripPrefix")}</Label>
              <p className="text-[11px] text-muted-foreground">
                {t("stripPrefixDesc")}
              </p>
            </div>
            <Switch
              id="strip-prefix-switch"
              checked={stripPrefix}
              onCheckedChange={setStripPrefix}
            />
          </div>

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
