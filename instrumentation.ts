export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      typeof localStorage === "undefined" ||
      typeof (localStorage as any).getItem !== "function"
    ) {
      const dummyLocalStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      };

      // Use Object.defineProperty to overwrite if it exists but is broken
      Object.defineProperty(global, "localStorage", {
        value: dummyLocalStorage,
        writable: true,
      });
    }
  }
}
