export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}

export interface HealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
}
