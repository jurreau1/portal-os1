import { useEffect, useRef, useState } from "react";

export function useApi<T>(
  load: (signal: AbortSignal) => Promise<T>,
  refreshMs = 0,
) {
  const [state, setState] = useState<{
    source: typeof load;
    data?: T;
    error?: string;
    loading: boolean;
    refreshing: boolean;
    updatedAt?: number;
  }>({ source: load, loading: true, refreshing: false });
  const [revision, setRevision] = useState(0);
  const active = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    active.current = true;
    setState((previous) => ({
      source: load,
      data: previous.source === load ? previous.data : undefined,
      error:
        previous.source === load && previous.data !== undefined
          ? previous.error
          : undefined,
      updatedAt: previous.source === load ? previous.updatedAt : undefined,
      loading: previous.source !== load || previous.data === undefined,
      refreshing: previous.source === load && previous.data !== undefined,
    }));
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({
            source: load,
            data,
            loading: false,
            refreshing: false,
            updatedAt: Date.now(),
          });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            error:
              error instanceof Error ? error.message : "Unable to load data",
            loading: false,
            refreshing: false,
          }));
      })
      .finally(() => {
        if (!controller.signal.aborted) active.current = false;
      });
    return () => {
      controller.abort();
      active.current = false;
    };
  }, [load, revision]);
  useEffect(() => {
    if (!refreshMs) return;
    const timer = window.setInterval(() => {
      if (!active.current && document.visibilityState === "visible")
        setRevision((value) => value + 1);
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, [refreshMs]);
  return {
    ...state,
    data: state.source === load ? state.data : undefined,
    error: state.source === load ? state.error : undefined,
    loading: state.source !== load || state.loading,
    reload: () => setRevision((value) => value + 1),
  };
}
