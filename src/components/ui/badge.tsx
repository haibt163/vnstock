import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      tone: {
        default: "bg-surface-3 text-fg-muted",
        accent: "bg-accent-soft text-accent",
        gain: "bg-gain-soft text-gain",
        loss: "bg-loss-soft text-loss",
        warn: "bg-warn/15 text-warn",
        live: "bg-gain-soft text-gain",
        demo: "bg-warn/15 text-warn",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
