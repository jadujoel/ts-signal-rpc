import { Signal } from 'signal-polyfill'

export type SignalState<T> = Signal.State<T>

export function createSignal<T>(initialValue: T, options?: Signal.Options<T>): SignalState<T> {
  return new Signal.State<T>(initialValue, options)
}

export type Getter<T> = () => T
export type Setter<T> = (value: T) => void
export type UseSignal<T> = [Getter<T>, Setter<T>] & {
  readonly get: Getter<T>
  readonly set: Setter<T>
}

export function useSignal<T>(initialValue: T, options?: Signal.Options<T>): UseSignal<T> {
  const signal = new Signal.State<T>(initialValue, options)
  const arr: UseSignal<T> = [
    () => {
      const v = signal.get()
      // console.log("[s] get", v);
      return v
    },
    (v: T) => {
      // console.log("[s] set", v);
      signal.set(v)
    }
  ] as UseSignal<T>
  /** @ts-expect-error Readonly Property */
  arr.get = arr[0]
  /** @ts-expect-error Readonly Property */
  arr.set = arr[1]
  return arr
}

let needsEnqueue = true

const watcher: Signal.subtle.Watcher = new Signal.subtle.Watcher(() => {
  if (needsEnqueue) {
    needsEnqueue = false
    queueMicrotask(processPending)
  }
})

function processPending(): void {
  needsEnqueue = true

  for (const signal of watcher.getPending()) {
    signal.get()
  }

  watcher.watch()
}

export type CleanUp = () => void
export type Callback = () => void

export function useEffect<T extends readonly unknown[]>(callback: Callback, dependencies: {[ K in keyof T]: UseSignal<T[K]>}): CleanUp {
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
  let cleanup: void | CleanUp
  const oncomputed: CleanUp = () => {
    if (cleanup) {
      cleanup()
    }
    cleanup = callback()
  }

  const computed = new Signal.Computed(() => {
    for (const dep of dependencies) {
      dep.get()
    }

    Promise.resolve().then(() => {
      oncomputed()
    })
  })

  watcher.watch(computed)
  computed.get()

  const unwatch: CleanUp = () => {
    watcher.unwatch(computed)
    if (cleanup) {
      cleanup()
    }
  }
  return unwatch
}
