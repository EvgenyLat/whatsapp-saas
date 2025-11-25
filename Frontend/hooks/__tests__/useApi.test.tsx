import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from '../useApi';
import { apiGet } from '../../lib/api';

// Mock the API module
jest.mock('../../lib/api');
const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>;

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch data on mount when immediate is true', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockedApiGet.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useApi('/test'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(mockedApiGet).toHaveBeenCalledWith('/test');
  });

  it('should not fetch data on mount when immediate is false', () => {
    renderHook(() => useApi('/test', { immediate: false }));

    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Network Error');
    mockedApiGet.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useApi('/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('Network Error');
  });

  it('should refetch data when refetch is called', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockedApiGet.mockResolvedValue(mockData);

    const { result } = renderHook(() => useApi('/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApiGet).toHaveBeenCalledTimes(1);

    // Call refetch
    await result.current.refetch();

    expect(mockedApiGet).toHaveBeenCalledTimes(2);
  });

  it('should set data when setData is called', () => {
    const { result } = renderHook(() => useApi('/test', { immediate: false }));

    const newData = { id: 2, name: 'New Test' };
    result.current.setData(newData);

    expect(result.current.data).toEqual(newData);
  });

  it('should refetch data at intervals when refetchInterval is set', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockedApiGet.mockResolvedValue(mockData);

    renderHook(() => useApi('/test', { refetchInterval: 1000 }));

    await waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledTimes(1);
    });

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockedApiGet).toHaveBeenCalledTimes(2);
    });
  });
});
