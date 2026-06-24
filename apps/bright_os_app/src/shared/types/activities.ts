export type ActionStatus = "New" | "Done";
export type ActionEventType = "create" | "update_title" | "update_description" | "set_status" | "reorder" | "delete" | "restore";

export interface ActionItem {
  id: string;
  title: string;
  description_md: string;
  status: ActionStatus;
  created_at_utc: string;
  updated_at_utc: string;
  completed_at_utc: string | null;
  sort_order: number | null;
  deleted_at_utc: string | null;
  restored_at_utc: string | null;
  pending?: boolean;
}

export interface ActionEventPayload {
  title?: string;
  description_md?: string;
  status?: ActionStatus;
  ordered_ids?: string[];
}

export interface PendingActionEvent {
  eventId: string;
  deviceId: string;
  clientSequence: number;
  type: ActionEventType;
  occurredAtUtc: string;
  actionId: string;
  payload: ActionEventPayload;
  baseServerRevision: number;
  payloadVersion: 1;
  status: "pending" | "syncing" | "failed";
  attemptCount: number;
  lastError?: string | null;
  enqueuedAtUtc: string;
  lastSyncAttemptAtUtc?: string | null;
}

export interface ActionsState {
  server_time_utc: string;
  server_revision: number;
  actions: ActionItem[];
  archived_actions: ActionItem[];
}

export interface ActionsSyncResponse {
  acknowledged_event_ids: string[];
  ignored_events: Array<{ event_id: string; reason: string }>;
  server_revision: number;
  server_time_utc: string;
  state: ActionsState;
}

export function emptyActionsState(now = new Date()): ActionsState {
  return {
    server_time_utc: now.toISOString(),
    server_revision: 0,
    actions: [],
    archived_actions: [],
  };
}
