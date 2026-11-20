import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormAlertProps {
  variant?: "error" | "success";
  children: React.ReactNode;
}

export function FormAlert({ variant = "error", children }: FormAlertProps) {
  const Icon = variant === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed",
        variant === "error"
          ? "border-danger/20 bg-danger/5 text-danger"
          : "border-primary/20 bg-primary/5 text-primary"
      )}
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
