/**
 * Standard payload carried by domain events that drive notifications (W11).
 * Carries recipient hints (used by recipient strategies) + template data.
 */
export interface NotificationEvent {
  actorId?: string | null; // ACTOR strategy
  ownerId?: string | null; // OWNER strategy
  departmentId?: string | null; // DEPARTMENT_HEAD strategy
  affectedUserIds?: string[]; // ALL_AFFECTED strategy
  entityType?: string;
  entityId?: string;
  data?: Record<string, string | number>; // template placeholders
}
