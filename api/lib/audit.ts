import { auditLogs } from "@db/schema";
import { getDb } from "../queries/connection";

export async function writeAuditLog(params: {
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await getDb().insert(auditLogs).values({
    actorUserId: params.actorUserId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    before: params.before === undefined ? null : JSON.stringify(params.before),
    after: params.after === undefined ? null : JSON.stringify(params.after),
  });
}
