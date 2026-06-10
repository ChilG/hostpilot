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
import { useAppStore, type Project } from "@/store/AppStore";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  project?: Project;
  onSave?: () => void;
};

const DEFAULT_FORM = { name: "", path: "", entryCount: 0, active: false };

export function ProjectFormDialog({ open, onOpenChange, mode, project, onSave }: Props) {
  const { addProject, updateProject, selectProjectFolder } = useAppStore();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (mode === "edit" && project) {
        setForm({ name: project.name, path: project.path, entryCount: project.entryCount, active: project.active });
      } else {
        setForm(DEFAULT_FORM);
      }
      setErrors({});
    }
  }, [open, mode, project]);

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Project name is required";
    if (!form.path.trim()) e.path = "Project path is required";
    if (Object.keys(e).length) { setErrors(e); return; }

    if (mode === "create") {
      addProject({ name: form.name.trim(), path: form.path.trim(), entryCount: 0, active: false });
    } else if (project) {
      updateProject(project.id, { name: form.name.trim(), path: form.path.trim() });
    }
    onSave?.();
    onOpenChange(false);
  };

  const handleBrowse = async () => {
    try {
      const selected = await selectProjectFolder();
      if (selected) {
        setForm((f) => {
          let suggestedName = f.name;
          if (!suggestedName) {
            // Guess project folder name from path
            const parts = selected.split(/[/\\]/).filter(Boolean);
            if (parts.length > 0) {
              // If last part is ".hostpilot", use parent folder name
              if (parts[parts.length - 1] === ".hostpilot" && parts.length > 1) {
                suggestedName = parts[parts.length - 2];
              } else {
                suggestedName = parts[parts.length - 1];
              }
            }
          }
          return {
            ...f,
            path: selected,
            name: suggestedName,
          };
        });
      }
    } catch (err) {
      console.error("Folder pick error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm dark">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Project" : "Edit Project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name">Project Name *</Label>
            <Input
              id="proj-name"
              placeholder="e.g. saas-platform"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-path">Path *</Label>
            <div className="flex gap-2">
              <Input
                id="proj-path"
                placeholder="/path/to/project/.hostpilot"
                value={form.path}
                onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
                className={`flex-1 ${errors.path ? "border-red-500" : ""}`}
              />
              <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={handleBrowse}>
                Browse
              </Button>
            </div>
            {errors.path && <p className="text-xs text-red-400">{errors.path}</p>}
            <p className="text-[10px] text-muted-foreground">
              Folder containing <code className="font-mono">.hostpilot/hosts.local</code> or project config
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
            {mode === "create" ? "Add Project" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
