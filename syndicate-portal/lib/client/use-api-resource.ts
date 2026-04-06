"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type LoadState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

export const useApiResource = <T>(loader: () => Promise<T>): LoadState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const stableLoader = useMemo(() => loader, [loader]);

  const run = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await stableLoader();
      setData(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }, [stableLoader]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, error, isLoading, reload: run };
};
