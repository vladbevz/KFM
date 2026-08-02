import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        // Paires fond très clair + texte assombri (pas la teinte "pure")
        // vérifiées au contraste WCAG AA (≥4.5:1) pour du texte de badge.
        success: "border-transparent bg-[#E6F4EC] text-[#187C4C]",
        warning: "border-transparent bg-[#FBF0DD] text-[#8A5C18]",
        destructive: "border-transparent bg-[#FBE7E5] text-[#C4342C]",
        info: "border-transparent bg-[#E8EEFB] text-[#2A5FBF]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
