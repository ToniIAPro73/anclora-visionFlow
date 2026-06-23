"use client";

interface Props {
  status: string;
  requestId?: string;
  returnLink?: string;
  onRetry?: () => void;
}

export function HandoffStatus({ status, requestId, returnLink, onRetry }: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 dark:border-border space-y-2">
      <h3 className="font-semibold">Estado del handoff</h3>
      <span
        className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
          status === "acknowledged"
            ? "bg-green-500/10 text-green-500"
            : status === "failed"
            ? "bg-destructive/10 text-destructive"
            : "bg-yellow-500/10 text-yellow-600"
        }`}
      >
        {status}
      </span>
      {requestId && (
        <p className="text-xs text-muted-foreground">Request ID: {requestId}</p>
      )}
      {returnLink && (
        <a href={returnLink} className="text-xs text-primary underline block">
          Ver caso en VisionFlow
        </a>
      )}
      {status === "failed" && onRetry && (
        <button onClick={onRetry} className="text-sm text-primary underline">
          Reintentar
        </button>
      )}
    </div>
  );
}
