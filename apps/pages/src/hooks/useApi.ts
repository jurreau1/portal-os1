import { useEffect, useState } from "react";
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            error:
              error instanceof Error ? error.message : "Unable to load data",
            loading: false,
          });
      });
    return () => controller.abort();
  }, [load, revision]);
  return { ...state, reload: () => setRevision((value) => value + 1) };
}
