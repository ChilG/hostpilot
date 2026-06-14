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
import { useTranslation } from "@/i18n/translations";
import { toast } from "sonner";
import { getBackupSchema } from "@/lib/schemas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
};

export function BackupCreateDialog({ open, onOpenChange, onSave }: Props) {
  const { addBackup } = useAppStore();
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setReason("");
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const schema = getBackupSchema(t);
    const result = schema.safeParse({
      reason: reason.trim() || t("manualBackup"),
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

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    try {
      await addBackup(reason.trim() || t("manualBackup"));
      onSave?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(t("failedToCreateBackup"), {
        description: String(err),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm dark">
        <DialogHeader>
          <DialogTitle>{t("createBackup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {t("backupSnapshotDesc")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="backup-reason">{t("backupReason")}</Label>
            <Input
              id="backup-reason"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={errors.reason ? "border-red-500" : ""}
            />
            {errors.reason && <p className="text-xs text-red-400">{errors.reason}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
            {t("createBackup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
