/**
 * Core type definitions for the worldmonitor monitoring system.
 * These types are shared across all monitor implementations.
 */

/** Supported HTTP methods for health check requests */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Possible states for any monitor */
export type MonitorStatus = 'up' | 'down' | 'degraded' | 'unknown';

/** Configuration for a single monitor target */
export interface MonitorConfig {
  /** Unique identifier for this monitor */
  id: string;
  /** Human-readable name */
  name: string;
  /** URL or endpoint to monitor */
  url: string;
  /** Interval between checks in milliseconds */
  intervalMs: number;
  /** Timeout for each check in milliseconds */
  timeoutMs: number;
  /** Number of consecutive failures before marking as down */
  failureThreshold: number;
  /** Optional tags for grouping monitors */
  tags?: string[];
}

/** Result of a single monitor check */
export interface CheckResult {
  /** ID of the monitor that produced this result */
  monitorId: string;
  /** Timestamp when the check was performed */
  timestamp: Date;
  /** Resolved status of the check */
  status: MonitorStatus;
  /** Response time in milliseconds, if applicable */
  responseTimeMs?: number;
  /** HTTP status code, if applicable */
  statusCode?: number;
  /** Error message if the check failed */
  errorMessage?: string;
  /** Additional metadata from the check */
  metadata?: Record<string, unknown>;
}

/** Aggregated state for a monitor across recent checks */
export interface MonitorState {
  config: MonitorConfig;
  currentStatus: MonitorStatus;
  lastCheckedAt: Date | null;
  lastStatusChangeAt: Date | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  /** Rolling average response time over recent checks (ms) */
  avgResponseTimeMs: number | null;
  recentResults: CheckResult[];
}

/** Interface that all monitor implementations must satisfy */
export interface Monitor {
  readonly config: MonitorConfig;
  /** Execute a single check and return the result */
  check(): Promise<CheckResult>;
  /** Start the monitor's polling loop */
  start(): void;
  /** Stop the monitor's polling loop */
  stop(): void;
  /** Get the current aggregated state */
  getState(): MonitorState;
}

/** Events emitted by monitors */
export type MonitorEvent =
  | { type: 'check_completed'; result: CheckResult }
  | { type: 'status_changed'; monitorId: string; previousStatus: MonitorStatus; newStatus: MonitorStatus }
  | { type: 'monitor_started'; monitorId: string }
  | { type: 'monitor_stopped'; monitorId: string };
