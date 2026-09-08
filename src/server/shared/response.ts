export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta: {
    timestamp: number
    requestId?: string
  }
}

export function createSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      requestId,
    },
  }
}

export function createFailureResponse(error: string, requestId?: string): ApiResponse<never> {
  return {
    success: false,
    error,
    meta: {
      timestamp: Date.now(),
      requestId,
    },
  }
}
