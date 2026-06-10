import { useState } from "react";
import { toast } from "sonner";
import { Topbar } from "@/components/layout/Topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore, type Project } from "@/store/AppStore";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import {
  FolderOpen,
  Plus,
  Zap,
  Clock,
  CheckCircle2,
  Folder,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";

export function ProjectsPage() {
  const { projects, activateProject, deleteProject, readProjectHostsFile } = useAppStore();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<Project | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Project | undefined>();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<Record<string, { content?: string; loading?: boolean; error?: string }>>({});

  const loadProjectFile = async (project: Project) => {
    if (projectFiles[project.id]?.loading) return;

    setProjectFiles((prev) => ({
      ...prev,
      [project.id]: { ...prev[project.id], loading: true },
    }));

    try {
      const content = await readProjectHostsFile(project.path);
      setProjectFiles((prev) => ({
        ...prev,
        [project.id]: { content, loading: false },
      }));
    } catch (e) {
      console.error(e);
      setProjectFiles((prev) => ({
        ...prev,
        [project.id]: { error: String(e), loading: false },
      }));
    }
  };

  const loadProjectFileForce = async (project: Project) => {
    setProjectFiles((prev) => ({
      ...prev,
      [project.id]: { loading: true },
    }));

    try {
      const content = await readProjectHostsFile(project.path);
      setProjectFiles((prev) => ({
        ...prev,
        [project.id]: { content, loading: false },
      }));
    } catch (e) {
      console.error(e);
      setProjectFiles((prev) => ({
        ...prev,
        [project.id]: { error: String(e), loading: false },
      }));
    }
  };

  // Auto load active projects
  const [loadedKeys, setLoadedKeys] = useState<Record<string, boolean>>({});
  const activeProj = projects.find((p) => p.active);
  if (activeProj && !projectFiles[activeProj.id] && !loadedKeys[activeProj.id]) {
    setLoadedKeys(prev => ({ ...prev, [activeProj.id]: true }));
    loadProjectFile(activeProj);
  }

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (p: Project) => {
    setFormMode("edit");
    setEditTarget(p);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteProject(deleteTarget.id);
    toast.success(`Project "${deleteTarget.name}" removed`);
    setDeleteTarget(undefined);
  };

  const handleActivate = async (project: Project) => {
    try {
      await activateProject(project.id);
      toast.success(`Project "${project.name}" activated`, {
        description: "hosts.local applied to managed block",
      });
      loadProjectFileForce(project);
    } catch (e) {
      toast.error("Failed to activate project", {
        description: String(e),
      });
    }
  };

  const handleDeactivate = async (project: Project) => {
    try {
      await activateProject("__none__");
      toast.success(`Project "${project.name}" deactivated`);
    } catch (e) {
      toast.error("Failed to deactivate project", {
        description: String(e),
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Projects"
        subtitle="Manage project-specific host configurations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
              <FolderOpen className="w-3.5 h-3.5" />
              Open Folder
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs"
              onClick={openCreate}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Project
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Info callout */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-4 flex items-start gap-3">
          <FolderOpen className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-400">Project Hosts Files</p>
            <p className="text-xs text-muted-foreground mt-1">
              hostpilot reads{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">.hostpilot/hosts.local</code>{" "}
              from your project folder. Activate a project to apply its hosts configuration to your system hosts file.
            </p>
          </div>
        </div>

        {/* Projects list */}
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`rounded-xl border bg-card p-5 hover:border-border/60 transition-colors group ${
                project.active ? "border-indigo-500/30" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      project.active ? "bg-indigo-500/20" : "bg-muted/60"
                    }`}
                  >
                    <Folder
                      className={`w-5 h-5 ${project.active ? "text-indigo-400" : "text-muted-foreground"}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{project.name}</p>
                      {project.active && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">Active</Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{project.path}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(project.lastActivatedAt).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {project.entryCount} host entries
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Always-visible edit/delete on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(project)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(project)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {project.active ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 mr-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Applied
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleDeactivate(project)}
                      >
                        Deactivate
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => {
                          const isExpanding = previewId !== project.id;
                          setPreviewId(isExpanding ? project.id : null);
                          if (isExpanding) loadProjectFile(project);
                        }}
                      >
                        Preview
                        <ChevronRight className={`w-3 h-3 transition-transform ${previewId === project.id ? "rotate-90" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        onClick={() => handleActivate(project)}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Activate
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Hosts.local preview */}
              {(project.active || previewId === project.id) && (
                <div className="mt-4 rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] font-mono text-muted-foreground/60 mb-2">.hostpilot/hosts.local</p>
                  {projectFiles[project.id]?.loading ? (
                    <p className="text-xs font-mono text-muted-foreground/60">Loading file...</p>
                  ) : projectFiles[project.id]?.error ? (
                    <p className="text-xs font-mono text-red-400">Error: {projectFiles[project.id]?.error}</p>
                  ) : (
                    <pre className="text-xs font-mono text-muted-foreground leading-5 overflow-x-auto max-h-48">
                      {projectFiles[project.id]?.content || "# Empty file"}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add placeholder */}
        <button
          onClick={openCreate}
          className="w-full rounded-xl border border-dashed border-border bg-transparent p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
        >
          <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Add Project</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse to a folder containing a <code className="font-mono">.hostpilot/hosts.local</code> file
            </p>
          </div>
        </button>
      </div>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        project={editTarget}
        onSave={() =>
          toast.success(formMode === "create" ? "Project added" : "Project updated")
        }
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(undefined)}>
        <AlertDialogContent className="dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be removed from hostpilot. Your project files will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
