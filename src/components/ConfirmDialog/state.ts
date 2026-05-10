// Module-level state + imperative API for the ConfirmDialog modal.
// Mirrors the host pattern used by AchievementToastHost / XpPopupHost:
// non-React callers push a request, the mounted host subscribes and
// renders the matching UI.
//
// Why a custom modal exists: RN-Web's `Alert.alert` cannot render the
// multi-button flow — destructive button onPress never fires — so sign-out
// / delete confirmations silently no-op on web. This module gives us a
// single API that resolves a Promise on either platform with a styled UI
// instead of falling back to `window.confirm`.

export interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  // Maps to a coral confirm button. Use for destructive actions
  // (sign-out, delete, discard).
  destructive?: boolean;
  resolve: (value: boolean) => void;
}

export interface NotifyRequest {
  kind: 'notify';
  title: string;
  body?: string;
  buttonLabel: string;
  resolve: () => void;
}

export interface ActionSheetRequest {
  kind: 'actions';
  title: string;
  body?: string;
  cancelLabel: string;
  actions: { label: string; destructive?: boolean }[];
  // Resolves with the picked action index, or `null` if the user
  // cancelled / dismissed.
  resolve: (selected: number | null) => void;
}

export type DialogRequest = ConfirmRequest | NotifyRequest | ActionSheetRequest;

type HostListener = (req: DialogRequest | null) => void;
// Stack of mounted hosts. We only emit to the TOPMOST one because RN
// <Modal> from a root-level host can't render above an iOS native
// modal-presented screen — each `presentation: 'modal'` Stack.Screen needs
// its own host mounted inside its tree, and the most recently mounted
// (deepest in the navigation stack) is the only one that should render.
const hosts: HostListener[] = [];
let current: DialogRequest | null = null;

export function registerHost(cb: HostListener): () => void {
  hosts.push(cb);
  cb(current);
  return () => {
    const idx = hosts.lastIndexOf(cb);
    if (idx >= 0) hosts.splice(idx, 1);
    // Hand off to the new topmost host so a dialog isn't stranded when its
    // owning screen unmounts mid-flight.
    const next = hosts[hosts.length - 1];
    if (next) next(current);
  };
}

function emit(): void {
  const top = hosts[hosts.length - 1];
  if (top) top(current);
}

export function confirm(opts: Omit<ConfirmRequest, 'kind' | 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    current = { kind: 'confirm', ...opts, resolve };
    emit();
  });
}

export function notify(opts: Omit<NotifyRequest, 'kind' | 'resolve'>): Promise<void> {
  return new Promise((resolve) => {
    current = { kind: 'notify', ...opts, resolve };
    emit();
  });
}

export function actionSheet(
  opts: Omit<ActionSheetRequest, 'kind' | 'resolve'>
): Promise<number | null> {
  return new Promise((resolve) => {
    current = { kind: 'actions', ...opts, resolve };
    emit();
  });
}

// Resolve the active request and clear the slot. Called by the host when
// the user picks an action or dismisses the dialog. The `payload` shape
// depends on the active request kind:
//   confirm → boolean (true = confirm, false = cancel/dismiss)
//   notify  → ignored
//   actions → number (action index) | null (cancel/dismiss)
export function resolveCurrent(payload: boolean | number | null): void {
  if (!current) return;
  if (current.kind === 'confirm') current.resolve(payload === true);
  else if (current.kind === 'notify') current.resolve();
  else current.resolve(typeof payload === 'number' ? payload : null);
  current = null;
  emit();
}
