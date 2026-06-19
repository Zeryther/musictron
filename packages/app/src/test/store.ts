import { afterEach } from 'vitest'

/**
 * Snapshot each store's initial state now and restore it after every test.
 *
 * Zustand stores are module singletons, so without this their state (and any
 * actions a test replaces via `setState`) leaks between tests. Call this once
 * at the top of a test file with the stores it touches.
 */
export function autoResetStores(
  ...stores: Array<{
    getState: () => object
    setState: (...args: never[]) => void
  }>
): void {
  const snapshots = stores.map((store) => ({
    setState: store.setState as (state: object, replace: true) => void,
    initial: { ...store.getState() },
  }))

  afterEach(() => {
    for (const { setState, initial } of snapshots) {
      setState(initial, true)
    }
  })
}
