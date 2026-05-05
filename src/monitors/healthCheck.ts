import axios, { AxiosRequestConfig } from 'axios';

export interface HealthCheckConfig {
  url: string;
  timeout?: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
}

export interface HealthCheckResult {
  url: string;
  status: 'up' | 'down' | 'degraded';
  statusCode?: number;
  responseTimeMs: number;
  error?: string;
  checkedAt: Date;
}

export async function performHealthCheck(
  config: HealthCheckConfig
): Promise<HealthCheckResult> {
  const { url, timeout = 5000, expectedStatus = 200, headers = {} } = config;
  const start = Date.now();

  const requestConfig: AxiosRequestConfig = {
    url,
    method: 'GET',
    timeout,
    headers,
    validateStatus: () => true,
  };

  try {
    const response = await axios(requestConfig);
    const responseTimeMs = Date.now() - start;
    const statusCode = response.status;

    let status: HealthCheckResult['status'];
    if (statusCode === expectedStatus) {
      status = responseTimeMs > timeout * 0.8 ? 'degraded' : 'up';
    } else {
      status = 'down';
    }

    return {
      url,
      status,
      statusCode,
      responseTimeMs,
      checkedAt: new Date(),
    };
  } catch (err: unknown) {
    const responseTimeMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);

    return {
      url,
      status: 'down',
      responseTimeMs,
      error,
      checkedAt: new Date(),
    };
  }
}

export async function performBatchHealthChecks(
  configs: HealthCheckConfig[]
): Promise<HealthCheckResult[]> {
  return Promise.all(configs.map((config) => performHealthCheck(config)));
}
