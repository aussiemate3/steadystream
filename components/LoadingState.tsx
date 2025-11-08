export function LoadingState() {
  return (
    <div className="text-sm text-muted-foreground text-center py-12">
      Still loading your stream
      <span className="inline-block animate-dot-pulse">...</span>
    </div>
  );
}
