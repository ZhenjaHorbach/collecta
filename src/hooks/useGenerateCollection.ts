import { useCallback, useState } from 'react';

import {
  AiGenerationError,
  type AiGeneratedCollection,
  type AiGenerationLocale,
  generateCollection,
} from '@services/ai-collection-generator.service';

interface State {
  generating: boolean;
  draft: AiGeneratedCollection | null;
  error: AiGenerationError | null;
}

const INITIAL: State = { generating: false, draft: null, error: null };

export function useGenerateCollection() {
  const [state, setState] = useState<State>(INITIAL);

  const generate = useCallback(
    async (prompt: string, locale: AiGenerationLocale): Promise<AiGeneratedCollection | null> => {
      setState({ generating: true, draft: null, error: null });
      try {
        const draft = await generateCollection(prompt, locale);
        setState({ generating: false, draft, error: null });
        return draft;
      } catch (err) {
        const error =
          err instanceof AiGenerationError
            ? err
            : new AiGenerationError('unknown', err instanceof Error ? err.message : String(err));
        setState({ generating: false, draft: null, error });
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => setState(INITIAL), []);

  return { ...state, generate, reset };
}
