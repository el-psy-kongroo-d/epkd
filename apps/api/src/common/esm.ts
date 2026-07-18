const dynamicImport = new Function("s", "return import(s)") as (specifier: string) => Promise<unknown>;

export const loadEsm = async <T = unknown>(specifier: string): Promise<T> => {
  try {
    return (await dynamicImport(specifier)) as T;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("dynamic import callback")) {
      return (await import(specifier)) as T;
    }
    throw err;
  }
};
