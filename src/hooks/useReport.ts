import { useCallback, useState } from 'react';

import { useAuth } from '@hooks/useAuth';
import {
  ReportError,
  type ReportReason,
  type ReportTarget,
  reportCollection,
  reportFind,
} from '@services/moderation.service';

interface SubmitInput {
  target: ReportTarget;
  targetId: string;
  reason: ReportReason;
  comment?: string;
}

interface State {
  submitting: boolean;
  error: ReportError | null;
  succeeded: boolean;
}

const INITIAL: State = { submitting: false, error: null, succeeded: false };

export function useReport() {
  const { user } = useAuth();
  const [state, setState] = useState<State>(INITIAL);

  const submit = useCallback(
    async ({ target, targetId, reason, comment }: SubmitInput): Promise<ReportError | null> => {
      if (!user) {
        const err = new ReportError('unauthorized');
        setState({ submitting: false, error: err, succeeded: false });
        return err;
      }
      setState({ submitting: true, error: null, succeeded: false });
      try {
        if (target === 'collection') {
          await reportCollection(user.id, targetId, reason, comment);
        } else {
          await reportFind(user.id, targetId, reason, comment);
        }
        setState({ submitting: false, error: null, succeeded: true });
        return null;
      } catch (err) {
        const error =
          err instanceof ReportError
            ? err
            : new ReportError('unknown', err instanceof Error ? err.message : String(err));
        setState({ submitting: false, error, succeeded: false });
        return error;
      }
    },
    [user]
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, submit, reset };
}
