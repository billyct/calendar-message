import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  back?: () => void;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, back, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b bg-background px-6 py-4", className)}>
      <div className="flex items-center gap-3">
        {back ? (
          <Button variant="ghost" size="icon" onClick={back} aria-label="返回">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <div>
          <h1 className="text-lg font-semibold leading-none">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
