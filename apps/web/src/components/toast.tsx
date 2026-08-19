"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "font-sans text-sm rounded-lg border border-border shadow-popover bg-card text-foreground",
          title: "font-semibold",
          description: "text-muted-foreground",
          success: "border-success/30 bg-success-subtle text-success",
          error: "border-danger/30 bg-danger-subtle text-danger",
          warning: "border-warning/30 bg-warning-subtle text-warning",
          info: "border-border",
          actionButton: "bg-primary text-primary-foreground font-medium text-xs",
          cancelButton: "bg-muted text-foreground text-xs",
        },
      }}
    />
  );
}

export { toast } from "sonner";
