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
};

export function HostFormDialog({ open, onOpenChange, mode, host, onSave }: Props) {
  const { groups, addHost, updateHost } = useAppStore();
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
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, mode, host]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.domain.trim()) e.domain = "Domain is required";
    else if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(form.domain.trim()))
      e.domain = "Invalid domain format";
    if (!form.ip.trim()) e.ip = "IP is required";
    else if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(form.ip.trim()))
      e.ip = "Invalid IP address";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const payload = {
      domain: form.domain.trim(),
      ip: form.ip.trim(),
      groupId: form.groupId || undefined,
      description: form.description.trim() || undefined,
      source: form.source,
      enabled: form.enabled,
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
      <DialogContent className="sm:max-w-md dark">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Host Entry" : "Edit Host Entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="host-domain">Domain *</Label>
            <Input
              id="host-domain"
              placeholder="e.g. web.local"
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              className={errors.domain ? "border-red-500" : ""}
            />
            {errors.domain && <p className="text-xs text-red-400">{errors.domain}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="host-ip">IP Address *</Label>
            <Input
              id="host-ip"
              placeholder="127.0.0.1"
              value={form.ip}
              onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
              className={errors.ip ? "border-red-500" : ""}
            />
            {errors.ip && <p className="text-xs text-red-400">{errors.ip}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Group</Label>
            <Select
              value={form.groupId || "none"}
              onValueChange={(v) => setForm((f) => ({ ...f, groupId: v === "none" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="host-desc">Description</Label>
            <Input
              id="host-desc"
              placeholder="Optional description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSave}
          >
            {mode === "create" ? "Add Host" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
