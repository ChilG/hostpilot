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
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { useAppStore, type PortRule } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import { getPortSchema } from "@/lib/schemas";
import { Search, Check, ChevronsUpDown, Plus } from "lucide-react";

function LocalPopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Content
      data-slot="popover-content"
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props}
    />
  );
}

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
  const { hosts, groups, addPort, updatePort } = useAppStore();
  const { t } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
      setPopoverOpen(false);
      setSearchTerm("");
    }
  }, [open, mode, rule]);

  const validate = () => {
    const schema = getPortSchema(t);
    const result = schema.safeParse({
      domain: form.domain.trim(),
      targetHost: form.targetHost.trim(),
      port: form.port,
      protocol: form.protocol,
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

  // Group hosts and filter by search term
  const groupsWithMatchingHosts = (() => {
    const filtered = hosts.filter((h) =>
      h.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: Record<string, typeof hosts> = {};
    filtered.forEach((h) => {
      const gId = h.groupId || "no-group";
      if (!grouped[gId]) grouped[gId] = [];
      grouped[gId].push(h);
    });

    const result: { id: string; name: string; color?: string; items: typeof hosts }[] = [];

    groups.forEach((g) => {
      const items = grouped[g.id];
      if (items && items.length > 0) {
        result.push({
          id: g.id,
          name: g.name,
          color: g.color,
          items,
        });
      }
    });

    const uncategorizedItems = grouped["no-group"];
    if (uncategorizedItems && uncategorizedItems.length > 0) {
      result.push({
        id: "no-group",
        name: t("uncategorized"),
        color: "#6b7280",
        items: uncategorizedItems,
      });
    }

    return result;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addPort") : t("editPort")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5 flex flex-col">
            <Label htmlFor="port-domain" className="mb-1">{t("domain")} *</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between h-9 px-3 py-2 text-sm font-normal border-input bg-transparent text-left cursor-pointer"
                >
                  <span className="truncate">
                    {form.domain || t("selectDomain")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <LocalPopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border border-border" align="start">
                <div className="flex items-center border-b border-border px-3 py-2 gap-2">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    className="flex h-7 w-full rounded-md bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
                    placeholder={t("searchDomain")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="max-h-[200px] overflow-y-auto p-1 space-y-1">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground text-left text-muted-foreground gap-1.5"
                    onClick={() => {
                      setForm((f) => ({ ...f, domain: "" }));
                      setPopoverOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="truncate">{t("customOption")}</span>
                  </button>

                  {searchTerm.trim() !== "" && !hosts.some(h => h.domain.toLowerCase() === searchTerm.toLowerCase()) && (
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground text-left text-indigo-400 gap-1.5"
                      onClick={() => {
                        setForm((f) => ({ ...f, domain: searchTerm.trim().toLowerCase() }));
                        setPopoverOpen(false);
                        setSearchTerm("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="truncate">{t("createCustom", { domain: searchTerm.trim() })}</span>
                    </button>
                  )}

                  {groupsWithMatchingHosts.map((groupWithHosts) => (
                    <div key={groupWithHosts.id} className="space-y-0.5 mt-1.5 border-t border-border/40 pt-1.5 first:border-0 first:pt-0">
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5 select-none">
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: groupWithHosts.color || '#6b7280' }} 
                        />
                        {groupWithHosts.name}
                      </div>
                      
                      {groupWithHosts.items.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          className={`flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs outline-hidden hover:bg-accent hover:text-accent-foreground text-left ${
                            form.domain === h.domain ? "bg-accent text-accent-foreground" : ""
                          }`}
                          onClick={() => {
                            setForm((f) => ({ ...f, domain: h.domain }));
                            setPopoverOpen(false);
                            setSearchTerm("");
                          }}
                        >
                          <span className="truncate">{h.domain}</span>
                          {form.domain === h.domain && (
                            <Check className="h-3.5 w-3.5 text-indigo-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                  
                  {groupsWithMatchingHosts.length === 0 && searchTerm.trim() === "" && (
                    <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                      {t("noHostsYetMessage") || "No domains available."}
                    </div>
                  )}
                  
                  {groupsWithMatchingHosts.length === 0 && searchTerm.trim() !== "" && (
                    <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                      {t("noDomainsFound")}
                    </div>
                  )}
                </div>
              </LocalPopoverContent>
            </Popover>

            {(!hostDomains.includes(form.domain) || form.domain === "") && (
              <Input
                id="port-domain"
                placeholder={t("domainPlaceholder")}
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value.toLowerCase() }))}
                className={errors.domain ? "border-red-500 mt-2" : "mt-2"}
              />
            )}
            {errors.domain && <p className="text-xs text-red-400 mt-1">{errors.domain}</p>}
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
              onChange={(e) => setForm((f) => ({ ...f, targetHost: e.target.value.toLowerCase() }))}
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
