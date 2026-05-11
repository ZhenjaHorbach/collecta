import { createElement, type ReactNode } from 'react';
import { Platform } from 'react-native';

// Wraps children in a real <form> on web so Chrome's password manager
// can detect <input type="password"> (silences the "Password field is
// not contained in a form" DevTools warning). On native this is a
// passthrough. Submitting via Enter on web triggers onSubmit and skips
// the default page reload.

interface WebFormProps {
  onSubmit: () => void;
  children: ReactNode;
}

export function WebForm({ onSubmit, children }: WebFormProps) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return createElement(
    'form',
    {
      onSubmit: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        onSubmit();
      },
    },
    children
  );
}
