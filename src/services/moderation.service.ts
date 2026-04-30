import type { Database, TablesInsert } from '@typings/database';

import { supabase } from './supabase.service';

export type ReportReason = 'spam' | 'inappropriate' | 'offTopic' | 'other';
export type ReportTarget = Database['public']['Enums']['report_target'];

export type ReportErrorCode = 'already_reported' | 'unauthorized' | 'network' | 'unknown';

export class ReportError extends Error {
  readonly code: ReportErrorCode;
  constructor(code: ReportErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

interface ReportInput {
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  comment?: string;
}

function buildReason(reason: ReportReason, comment?: string): string {
  const trimmed = comment?.trim();
  return trimmed ? `${reason}: ${trimmed}` : reason;
}

async function insertReport(input: ReportInput): Promise<void> {
  const row: TablesInsert<'reports'> = {
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: buildReason(input.reason, input.comment),
  };
  const { error } = await supabase.from('reports').insert(row);
  if (!error) return;
  if (error.code === '23505') throw new ReportError('already_reported', error.message);
  if (error.code === '42501') throw new ReportError('unauthorized', error.message);
  throw new ReportError('network', error.message);
}

export async function reportCollection(
  reporterId: string,
  collectionId: string,
  reason: ReportReason,
  comment?: string
): Promise<void> {
  await insertReport({
    reporterId,
    targetType: 'collection',
    targetId: collectionId,
    reason,
    comment,
  });
}

export async function reportFind(
  reporterId: string,
  findId: string,
  reason: ReportReason,
  comment?: string
): Promise<void> {
  await insertReport({
    reporterId,
    targetType: 'find',
    targetId: findId,
    reason,
    comment,
  });
}
