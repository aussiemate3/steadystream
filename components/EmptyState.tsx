interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'Nothing here yet' }: EmptyStateProps) {
  return (
    <div className="text-sm text-muted-foreground text-center py-12">
      {message}
    </div>
  );
}
