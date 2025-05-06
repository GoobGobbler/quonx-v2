import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Use muted foreground or a slightly lighter background variant for skeleton
      // Removed rounded-md for sharper corners
      className={cn("animate-pulse bg-muted/50", className)}
      {...props}
    />
  )
}

export { Skeleton }
