import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-transparent px-4 text-sm font-bold tracking-[0.01em] transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--motion-duration-fast)] outline-none select-none focus-visible:border-ring focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-focus-ring active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-[length:var(--focus-ring-width)] aria-invalid:ring-validation-ring [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_2px_0_var(--color-primary-strong)] hover:bg-primary/90",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        outline:
          "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "min-h-auto px-0 text-primary underline-offset-4 shadow-none hover:underline",
      },
      size: {
        default: "h-10",
        sm: "h-9 min-h-9 px-3 text-xs",
        lg: "h-11 min-h-11 px-5",
        icon: "size-10 min-h-10 px-0",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

function Button({
  className,
  size = "default",
  variant = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
