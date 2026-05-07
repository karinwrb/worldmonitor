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

  // Personal note: 401 Unauthorized is worth catching explicitly — useful for
  // detecting expired API keys or misconfigured auth on monitored services.
  it('returns status "down" for 401 Unauthorized', async () => {
    mockedAxios.mockResolvedValueOnce({ status: 401, data: {} } as any);

    const result = await performHealthCheck({
      url: 'https://example.com',
      expectedStatus: 200,
    });

    expect(result.status).toBe('down');
    expect(result.statusCode).toBe(401);
  });

  // Personal note: ECONNREFUSED is the error you get when nothing is listening
  // on the target port. Good to verify it surfaces cleanly as "down" with the
  // right error message rather than an unhandled rejection.
  it('returns status "down" with error message on ECONNREFUSED', async () => {
    mockedAxios.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8080'));

    const result = await performHealthCheck({ url: 'http://localhost:8080' });

    expect(result.status).toBe('down');
    expect(result.error).toBe('connect ECONNREFUSED 127.0.0.1:8080');
    expect(result.statusCode).toBeUndefined();
  });
});

describe('performBatchHealthChecks', () => {
  it('returns results for all provided configs', async () => {
    mockedA