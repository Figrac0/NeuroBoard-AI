// Snapshot store — сохранение и восстановление состояния до действий агента.
// Generic и не зависит от React: в этом проекте TState = ItemFormValues.
// Перед каждым шагом runner делает capture(), а UI может restore() для отката.

export interface Snapshot<TState> {
  readonly id: string
  readonly label: string
  readonly at: number
  readonly state: TState // глубокая копия — restore безопасен от мутаций
}

export interface SnapshotStore<TState> {
  capture(label: string, state: TState): Snapshot<TState>
  list(): readonly Snapshot<TState>[]
  latest(): Snapshot<TState> | null
  restore(id: string): TState
  clear(): void
}

function defaultClone<TState>(state: TState): TState {
  return structuredClone(state)
}

export function createSnapshotStore<TState>(
  clone: (state: TState) => TState = defaultClone,
): SnapshotStore<TState> {
  const snapshots: Snapshot<TState>[] = []

  return {
    capture(label, state) {
      const snapshot: Snapshot<TState> = {
        id: crypto.randomUUID(),
        label,
        at: Date.now(),
        state: clone(state),
      }
      snapshots.push(snapshot)
      return snapshot
    },
    list() {
      return [...snapshots]
    },
    latest() {
      return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
    },
    restore(id) {
      const found = snapshots.find((snapshot) => snapshot.id === id)

      if (!found) {
        throw new Error(`Snapshot ${id} not found`)
      }

      return clone(found.state)
    },
    clear() {
      snapshots.length = 0
    },
  }
}
