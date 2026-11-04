type TapBase = {
  patientId: string
  patientName: string | null
  medId: string
  medName: string
  dose: string | null
  slot: string
  nextDose: string | null
  message: string
}

export type TapResult = TapBase &
  (
    | { status: 'recorded'; takenAt: string; minutesLate: number; onTime: boolean }
    | { status: 'duplicate'; minutesAgo: number }
    | { status: 'early'; minutesUntil: number }
  )

export type Profile = {
  patientId: string
  name: string
  caregiverName: string
  caregiverContact: string
}

export type Medication = {
  medId: string
  name: string
  dose: string
  times: string[]
  windowMin: number
  tagId: string
  notes: string
  createdAt: string
}

export type NewMedication = {
  name: string
  dose?: string
  times: string[]
  windowMin?: number
  tagId?: string
  notes?: string
}

export type DoseStatus = 'taken' | 'due' | 'missed' | 'upcoming'

export type ScheduledDose = {
  medId: string
  medName: string
  dose: string | null
  slot: string
  status: DoseStatus
  takenAt: string | null
}

export type Alert = {
  type: 'missed' | 'duplicate'
  medName: string
  slot: string
  message: string
  createdAt: string
}

export type RecentDose = {
  medName: string
  slot: string
  takenAt: string
  onTime: boolean
  minutesLate: number
}

export type AdherenceDay = {
  date: string
  expected: number
  taken: number
  pct: number | null
}

export type PatientDashboard = {
  profile: Profile
  meds: Medication[]
  today: ScheduledDose[]
  alerts: Alert[]
  recentDoses: RecentDose[]
  adherence: { pct: number | null; days: AdherenceDay[] }
  serverTime: string
}

export type PrescriptionRequest = {
  imageBase64: string
  mediaType: string
  patientId?: string
  save?: boolean
}

export type ParsedMedication = {
  name: string | null
  dose: string | null
  times: string[]
  durationDays: number | null
  notes: string | null
}

export type ParsedPrescription = {
  legible: boolean
  notes: string
  medications: ParsedMedication[]
  created: Medication[]
}

export type DemoSeedOptions = {
  name?: string
  caregiverName?: string
  missedInMinutes?: number
}

export type DemoSeedResult = {
  patientId: string
  meds: Medication[]
  info: string
}
