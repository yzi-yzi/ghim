import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center justify-center rounded-full border px-2.5 text-[0.68rem] font-extrabold tracking-[0.08em] uppercase focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-focus-ring focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary text-primary-foreground",
        secondary:
          "border-accent-strong/25 bg-accent text-accent-foreground",
        outline: "border-border bg-background text-foreground",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  render,
  variant = "default",
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props,
    ),
    render,
    state: { slot: "badge", variant },
  });
}

export { Badge, badgeVariants };
