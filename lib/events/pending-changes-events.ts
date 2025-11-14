/**
 * Sistema di eventi per notificare aggiornamenti ai pending changes
 */

type PendingChangesListener = () => void;

class PendingChangesEventEmitter {
  private listeners: Set<PendingChangesListener> = new Set();

  subscribe(listener: PendingChangesListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit() {
    this.listeners.forEach(listener => listener());
  }
}

export const pendingChangesEvents = new PendingChangesEventEmitter();

