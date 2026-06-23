export interface LeadStatusEvent {
  caseId: string;
  workspaceId: string;
  nodeId?: string;
  leadStatus: "active" | "negotiating" | "closed_won" | "closed_lost" | "stale";
  source: "nexus" | "manual";
  timestamp: string;
}

// In-memory pub/sub for WebSocket events.
// Production: replace with Redis pub/sub or Supabase Realtime (DEC-DEPTH-002).
const subscribers = new Map<string, Set<(event: LeadStatusEvent) => void>>();

export function subscribeToLeadUpdates(
  caseId: string,
  callback: (event: LeadStatusEvent) => void
): () => void {
  if (!subscribers.has(caseId)) {
    subscribers.set(caseId, new Set());
  }
  subscribers.get(caseId)!.add(callback);

  return () => {
    subscribers.get(caseId)?.delete(callback);
    if (subscribers.get(caseId)?.size === 0) {
      subscribers.delete(caseId);
    }
  };
}

export function publishLeadStatus(event: LeadStatusEvent): void {
  const subs = subscribers.get(event.caseId);
  if (subs) {
    for (const cb of subs) {
      try {
        cb(event);
      } catch {
        // subscriber error isolation — do not let one bad subscriber kill others
      }
    }
  }
}

export function getActiveSubscriberCount(caseId: string): number {
  return subscribers.get(caseId)?.size ?? 0;
}
