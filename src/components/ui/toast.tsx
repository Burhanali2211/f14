import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-2 right-2 left-2 z-[100] flex max-h-screen w-auto flex-col gap-2 sm:left-auto sm:top-4 sm:right-4 sm:w-full md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden rounded-lg sm:rounded-xl border p-4 sm:p-6 pr-8 sm:pr-8 shadow-2xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=closed]:slide-out-to-left-full data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-right-full data-[state=open]:sm:slide-in-from-right-full backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border bg-gradient-to-br from-background to-background/95 text-foreground border-primary/20",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
        celebration: "border bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/60 dark:via-teal-950/60 dark:to-cyan-950/60 text-foreground border-emerald-400/40 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/10",
        birthday: "border bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50 dark:from-sky-950/70 dark:via-cyan-950/70 dark:to-emerald-950/70 text-foreground border-sky-300/50 dark:border-cyan-400/40 shadow-lg shadow-cyan-500/20 dark:shadow-cyan-400/10",
        martyrdom: "border bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/60 dark:via-indigo-950/60 dark:to-blue-950/60 text-foreground border-purple-400/40 dark:border-purple-500/30 shadow-lg shadow-purple-500/10",
        death: "border bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/60 dark:via-gray-950/60 dark:to-zinc-950/60 text-foreground border-slate-400/40 dark:border-slate-500/30 shadow-lg shadow-slate-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root 
      ref={ref} 
      className={cn(toastVariants({ variant }), className)} 
      duration={Infinity}
      {...props} 
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors group-[.destructive]:border-muted/40 hover:bg-secondary group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-[.destructive]:focus:ring-destructive disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1.5 top-1.5 sm:right-2 sm:top-2 rounded-md p-1.5 sm:p-1 text-foreground/50 opacity-70 sm:opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 hover:text-foreground group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600 touch-manipulation",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4 sm:h-4 sm:w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm sm:text-sm font-semibold w-full", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-xs sm:text-sm opacity-90 w-full", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
