import type {
  DemoSeedOptions,
  DemoSeedResult,
  Medication,
  NewMedication,
  ParsedPrescription,
  PatientDashboard,
  PrescriptionRequest,
  TapResult,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(0, 'unknown', 'Algo salió mal. Inténtalo de nuevo.')
}

type ErrorBody = { error?: string; message?: string }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, init)
  } catch {
    throw new ApiError(0, 'network', 'No pudimos conectarnos. Revisa tu internet.')
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const { error, message } = (body ?? {}) as ErrorBody
    throw new ApiError(response.status, error ?? 'http_error', message ?? 'Algo salió mal. Inténtalo de nuevo.')
  }
  return body as T
}

function post(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

const patientPath = (patientId: string) => `/patients/${encodeURIComponent(patientId)}`

export const api = {
  tap: (tagId: string, ctr?: string) => request<TapResult>('/tap', post({ tagId, ctr })),

  getPatient: (patientId: string) => request<PatientDashboard>(patientPath(patientId)),

  createMedication: (patientId: string, medication: NewMedication) =>
    request<Medication>(`${patientPath(patientId)}/meds`, post(medication)),

  deleteMedication: (patientId: string, medId: string) =>
    request<{ deleted: string }>(`${patientPath(patientId)}/meds/${encodeURIComponent(medId)}`, {
      method: 'DELETE',
    }),

  parsePrescription: (payload: PrescriptionRequest) =>
    request<ParsedPrescription>('/prescriptions/parse', post(payload)),

  seedDemo: (options: DemoSeedOptions = {}) => request<DemoSeedResult>('/demo/seed', post(options)),
}
