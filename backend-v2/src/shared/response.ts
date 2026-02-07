export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: PaginatedData<T>;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function created<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiPaginatedResponse<T> {
  return {
    success: true,
    data: { items, total, page, pageSize },
    timestamp: new Date().toISOString(),
  };
}
