import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DownloadConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  onConfirm: () => void;
  isDownloading?: boolean;
}

export function DownloadConfirmModal({
  open,
  onOpenChange,
  filename,
  onConfirm,
  isDownloading,
}: DownloadConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] sm:max-w-sm rounded-3xl p-6 bg-background border border-border/80 shadow-2xl animate-in fade-in-0 zoom-in-95">
        <DialogHeader className="text-left space-y-2">
          <DialogTitle className="font-display text-xl font-bold tracking-tight text-foreground">
            Download
          </DialogTitle>
          <DialogDescription className="text-sm text-foreground/80 leading-relaxed pt-1">
            Download File <span className="font-medium text-foreground">{filename}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end gap-6 pt-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
            className="text-sm font-bold uppercase tracking-wider text-primary hover:opacity-80 transition disabled:opacity-50 px-2 py-1"
          >
            NO
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isDownloading}
            className="text-sm font-bold uppercase tracking-wider text-primary hover:opacity-80 transition disabled:opacity-50 px-2 py-1"
          >
            {isDownloading ? "DOWNLOADING..." : "YES"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
