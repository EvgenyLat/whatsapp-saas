import axios from 'axios';
import { apiGet, apiPost } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('apiGet', () => {
    it('should make GET request with correct URL', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      const result = await apiGet('/test');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:4000/test',
        { headers: {} }
      );
      expect(result).toEqual(mockData);
    });

    it('should call axios.get with correct URL', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      await apiGet('/test');

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:4000/test');
    });

    it('should throw error when request fails', async () => {
      const error = new Error('Network Error');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(apiGet('/test')).rejects.toThrow('API Error: Network Error');
    });

    it('should throw error with response message when available', async () => {
      const error = {
        response: {
          data: { message: 'Server Error' }
        }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(apiGet('/test')).rejects.toThrow('API Error: Server Error');
    });
  });

  describe('apiPost', () => {
    it('should make POST request with correct data', async () => {
      const mockData = { id: 1, name: 'Test' };
      const postData = { name: 'Test' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockData });

      const result = await apiPost('/test', postData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:4000/test',
        postData,
        { headers: {} }
      );
      expect(result).toEqual(mockData);
    });

    it('should call axios.post with correct URL and data', async () => {
      const mockData = { id: 1, name: 'Test' };
      const postData = { name: 'Test' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockData });

      await apiPost('/test', postData);

      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:4000/test', postData);
    });

    it('should throw error when request fails', async () => {
      const error = new Error('Network Error');
      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(apiPost('/test', {})).rejects.toThrow('API Error: Network Error');
    });
  });
});
