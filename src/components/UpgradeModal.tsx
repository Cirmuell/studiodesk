import { useNavigate } from "@tanstack/react-router";
import { X, ChevronRight } from "lucide-react";

export function UpgradeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-background/40">
      <div 
        className="absolute inset-0" 
        onClick={() => onOpenChange(false)} 
      />
      
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-accent to-secondary" />
        
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 size-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="size-4" />
        </button>

        <div className="p-6 pt-8">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-5 ring-4 ring-primary/5">
          </div>
          
          <h2 className="font-display text-2xl text-foreground mb-3">
            Plan limit reached
          </h2>
          
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            You have exhausted your Basic plan limit. Please renew or upgrade to Premium in Settings to continue using the AI pricing and drafting features.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/settings", hash: "billing" } as any);
              }}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[var(--shadow-pop)]"
            >
              Manage Subscription
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full h-12 rounded-xl bg-transparent text-muted-foreground font-medium hover:bg-muted/50 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
