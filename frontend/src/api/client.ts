import axios, { type AxiosError } from 'axios'

interface ApiErrorBody {
  error: string
  message?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  error: string
  status?: number
  details?: Record<string, unknown>

  constructor(body: ApiErrorBody, status?: number) {
    super(body.message ?? body.error)
    this.name = 'ApiError'
    this.error = body.error
    this.status = status
    this.details = body
  }
}

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.data?.error) {
      return Promise.reject(new ApiError(error.response.data, error.response.status))
    }
    return Promise.reject(error)
  },
)
