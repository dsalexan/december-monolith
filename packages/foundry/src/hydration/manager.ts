export default class HTMLHydrationManager {
  storageKey: string

  // child components
  // [...]

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  get storage() {
    const self = this

    return {
      get<T>(key: string, defaultValue?: T) {
        const _key = `${self.storageKey}.${key}`
        const value = window.localStorage.getItem(_key)
        return value === null ? defaultValue : (JSON.parse(value) as T)
      },

      set<T>(key: string, value: T) {
        const _key = `${self.storageKey}.${key}`
        window.localStorage.setItem(_key, JSON.stringify(value))
      },

      remove(key: string) {
        const _key = `${self.storageKey}.${key}`
        window.localStorage.removeItem(_key)
      },
    }
  }

  hydrate(html: JQuery<HTMLElement>) {
    // call hydrate on all child components
  }
}
