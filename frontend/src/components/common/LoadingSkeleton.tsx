interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`} />;
}
