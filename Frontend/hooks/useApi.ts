import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

interface UseApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

interface UseApiOptions {
    immediate?: boolean;
    refetchInterval?: number;
}

export function useApi<T>(
    endpoint: string,
    options: UseApiOptions = {}
): UseApiState<T> & {
    refetch: () => Promise<void>;
    setData: (data: T | null) => void;
} {
    const { immediate = true, refetchInterval } = options;
    const [state, setState] = useState<UseApiState<T>>({
        data: null,
        loading: immediate,
        error: null,
    });

    const fetchData = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const data = await apiGet<T>(endpoint);
            setState({ data, loading: false, error: null });
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'An error occurred',
            }));
        }
    }, [endpoint]);

    const setData = useCallback((data: T | null) => {
        setState(prev => ({ ...prev, data }));
    }, []);

    useEffect(() => {
        if (immediate) {
            fetchData();
        }
    }, [fetchData, immediate]);

    useEffect(() => {
        if (refetchInterval && refetchInterval > 0) {
            const interval = setInterval(fetchData, refetchInterval);
            return () => clearInterval(interval);
        }
        return undefined;
    }, [fetchData, refetchInterval]);

    return {
        ...state,
        refetch: fetchData,
        setData,
    };
}

