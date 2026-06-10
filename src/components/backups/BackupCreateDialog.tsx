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
import { useAppStore } from "@/store/AppStore";

import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
};

export function BackupCreateDialog({ open, onOpenChange, onSave }: Props) {
  const { addBackup } = useAppStore();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const handleSave = async () => {
    try {
      await addBackup(reason.trim() || "Manual backup");
      onSave?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to create backup", {
        description: String(err),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm dark">
        <DialogHeader>
          <DialogTitle>Create Backup</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Creates a snapshot of the current <code className="font-mono text-xs">/etc/hosts</code> state.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="backup-reason">Reason (optional)</Label>
            <Input
              id="backup-reason"
              placeholder="e.g. Manual backup before changes"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
            Create Backup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
