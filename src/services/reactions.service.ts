import { awardXp } from './gamification.service';
import { supabase } from './supabase.service';

export type ReactionType = 'like' | 'fire' | 'wow';
export const REACTION_TYPES: readonly ReactionType[] = ['like', 'fire', 'wow'] as const;

export interface ReactionRow {
  id: string;
  userId: string;
  findId: string;
  type: ReactionType;
  createdAt: string;
}

export interface ReactionAggregate {
  counts: Record<ReactionType, number>;
  mine: ReactionType[];
}

export async function listReactionsForFind(findId: string): Promise<ReactionRow[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('id, user_id, find_id, type, created_at')
    .eq('find_id', findId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    findId: r.find_id,
    type: r.type as ReactionType,
    createdAt: r.created_at,
  }));
}

export async function aggregateReactionsForFind(
  findId: string,
  viewerUserId: string | null
): Promise<ReactionAggregate> {
  const rows = await listReactionsForFind(findId);
  const counts: Record<ReactionType, number> = { like: 0, fire: 0, wow: 0 };
  const mine: ReactionType[] = [];
  for (const r of rows) {
    counts[r.type] += 1;
    if (viewerUserId && r.userId === viewerUserId) mine.push(r.type);
  }
  return { counts, mine };
}

export async function addReaction(
  userId: string,
  findId: string,
  type: ReactionType
): Promise<void> {
  const { error } = await supabase
    .from('reactions')
    .insert({ user_id: userId, find_id: findId, type });
  if (error) {
    // Unique constraint = already reacted; treat as idempotent success.
    if (error.code !== '23505') throw error;
    return;
  }
  // Fire-and-forget — same pattern as createFind. award-xp gates streak/level
  // but must never block the UI response.
  void awardXp(userId, 'reaction');
}

export async function removeReaction(
  userId: string,
  findId: string,
  type: ReactionType
): Promise<void> {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('user_id', userId)
    .eq('find_id', findId)
    .eq('type', type);
  if (error) throw error;
}

export async function toggleReaction(
  userId: string,
  findId: string,
  type: ReactionType,
  hasMine: boolean
): Promise<'added' | 'removed'> {
  if (hasMine) {
    await removeReaction(userId, findId, type);
    return 'removed';
  }
  await addReaction(userId, findId, type);
  return 'added';
}
