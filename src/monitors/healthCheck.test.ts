import axios from 'axios';
import { performHealthCheck, performBatchHealthChecks } from './healthCheck';

jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('performHealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns status "up" when response matches expected status', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, data: {} } as any);

    const result = await performHealthCheck({ url: 'https://example.com' });

    expect(result.status).toBe('up');
    expect(result.statusCode).toBe(200);
    expect(result.url).toBe('https://example.com');
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it('returns status "down" when response status does not match', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 500, data: {} } as any);

    const result = await performHealthCheck({
      url: 'https://example.com',
      expectedStatus: 200,
    });

    expect(result.status).toBe('down');
    expect(result.statusCode).toBe(500);
  });

  it('returns status "down" with error message on network failure', async () => {
    mockedAxios.mockRejectedValueOnce(new Error('Network Error'));

    const result = await performHealthCheck({ url: 'https://unreachable.dev' });

    expect(result.status).toBe('down');
    expect(result.error).toBe('Network Error');
    expect(result.statusCode).toBeUndefined();
  });

  it('uses custom timeout and headers', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 200, data: {} } as any);

    await performHealthCheck({
      url: 'https://example.com',
      timeout: 3000,
      headers: { Authorization: 'Bearer token' },
    });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 3000,
        headers: { Authorization: 'Bearer token' },
      })
    );
  });

  // Personal note: 503 is a common status for services under maintenance;
  // worth testing explicitly to make sure it's treated as "down".
  it('returns status "down" for 503 Service Unavailable', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 503, data: {} } as any);

    const result = await performHealthCheck({
      url: 'https://example.com',
      expectedStatus: 200,
    });

    expect(result.status).toBe('down');
    expect(result.statusCode).toBe(503);
  });
});

describe('performBatchHealthChecks', () => {
  it('returns results for all provided configs', async () => {
    mockedAxios
      .mockResolvedValueOnce({ status: 200, data: {} } as any)
      .mockResolvedValueOnce({ status: 503, data: {} } as any);

    const results = await performBatchHealthChecks([
      { url: 'https://service-a.com' },
      { url: 'https://service-b.com' },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('up');
    expect(results[1].status).toBe('down');
  });
});
