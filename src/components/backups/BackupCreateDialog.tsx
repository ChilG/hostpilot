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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
};

export function BackupCreateDialog({ open, onOpenChange, onSave }: Props) {
  const { addBackup } = useAppStore();
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const handleSave = async () => {
    try {
      await addBackup(reason.trim() || (t("locale") === "th" ? "การสำรองข้อมูลด้วยตนเอง" : "Manual backup"));
      onSave?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(t("locale") === "th" ? "ไม่สามารถสำรองข้อมูลได้" : "Failed to create backup", {
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
            {t("locale") === "th"
              ? "ทำการบันทึกภาพสำเนา (Snapshot) ประวัติของไฟล์ hosts ในระบบของคุณ ณ ตอนนี้เก็บรักษาไว้"
              : "Creates a snapshot of the current hosts state."}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="backup-reason">{t("backupReason")}</Label>
            <Input
              id="backup-reason"
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
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
