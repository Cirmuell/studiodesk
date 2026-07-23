import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Save, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_at?: string;
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: { title?: string; description?: string | null; status?: TaskStatus; priority?: TaskPriority }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
    }
  }, [task]);

  if (!task) return null;

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(task!.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setDeleting(true);
      try {
        await onDelete(task!.id);
        onOpenChange(false);
      } finally {
        setDeleting(false);
      }
    }
  }

  const statuses: { id: TaskStatus; label: string }[] = [
    { id: "todo", label: "To Do" },
    { id: "in_progress", label: "In Progress" },
    { id: "review", label: "In Review" },
    { id: "done", label: "Done" },
  ];

  const priorities: { id: TaskPriority; label: string; color: string }[] = [
    { id: "low", label: "Low", color: "text-muted-foreground bg-muted" },
    { id: "medium", label: "Medium", color: "text-amber-500 bg-amber-500/10" },
    { id: "high", label: "High", color: "text-destructive bg-destructive/10" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] sm:max-w-md rounded-3xl p-6 bg-background border border-border/80 shadow-2xl animate-in fade-in-0 zoom-in-95">
        <DialogHeader className="text-left flex items-center justify-between pb-2">
          <DialogTitle className="font-display text-lg font-bold tracking-tight text-foreground">
            Task Details
          </DialogTitle>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="p-1.5 rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition"
            title="Delete Task"
          >
            <Trash2 className="size-4.5" />
          </button>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Title */}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Task title..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              Description / Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Add task details, checklist, or instructions..."
            />
          </div>

          {/* Status Workflow */}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              Status Workflow
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/50">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id)}
                  className={cn(
                    "h-8 rounded-xl text-xs font-semibold transition-all",
                    status === s.id
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">
              Priority
            </label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    "flex-1 h-9 rounded-xl text-xs font-semibold border transition-all",
                    priority === p.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-10 px-4 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-[var(--shadow-pop)] disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Save className="size-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
