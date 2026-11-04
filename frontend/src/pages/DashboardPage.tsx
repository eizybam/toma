import { useRef, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { AdherencePanel } from '@/components/dashboard/AdherencePanel'
import { AlertsFeed } from '@/components/dashboard/AlertsFeed'
import { MedicationList } from '@/components/dashboard/MedicationList'
import { PatientHeader } from '@/components/dashboard/PatientHeader'
import { Section } from '@/components/dashboard/Section'
import { TodayTimeline } from '@/components/dashboard/TodayTimeline'
import { PageMessage } from '@/components/PageMessage'
import { TimelineAnimation } from '@/components/ui/timeline-animation'
import { Button, ButtonLink } from '@/components/ui/button'
import { usePatient } from '@/hooks/usePatient'

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.45 } }),
}

export function DashboardPage() {
  const { patientId = '' } = useParams()
  const { data, error, refresh } = usePatient(patientId)
  const pageRef = useRef<HTMLDivElement>(null)

  if (!data) {
    if (error?.code === 'unknown_patient') {
      return (
        <PageMessage title="No encontramos a este paciente" body="Revisa el enlace o prepara la demo para empezar.">
          <ButtonLink to="/demo">Preparar la demo</ButtonLink>
        </PageMessage>
      )
    }
    if (error) {
      return (
        <PageMessage title="No pudimos cargar el panel" body={error.message}>
          <Button onClick={() => void refresh()}>Intentar de nuevo</Button>
        </PageMessage>
      )
    }
    return <PageMessage title="Cargando el panel…" loading />
  }

  const reload = () => void refresh()
  const block = (index: number, children: ReactNode) => (
    <TimelineAnimation animationNum={index} timelineRef={pageRef} customVariants={reveal}>
      {children}
    </TimelineAnimation>
  )

  return (
    <div ref={pageRef} className="mx-auto max-w-6xl px-4 py-6 sm:px-8 lg:py-10">
      <title>{`${data.profile.name} · Toma`}</title>
      {block(0, <PatientHeader profile={data.profile} offline={Boolean(error)} />)}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-10">
          {block(
            1,
            <Section title="Alertas">
              <AlertsFeed alerts={data.alerts} now={data.serverTime} />
            </Section>,
          )}
          {block(
            2,
            <Section title="Hoy">
              <TodayTimeline doses={data.today} />
            </Section>,
          )}
        </div>
        <aside className="grid content-start gap-10">
          {block(
            3,
            <Section title="Cumplimiento">
              <AdherencePanel adherence={data.adherence} />
            </Section>,
          )}
          {block(
            4,
            <Section title="Medicamentos">
              <MedicationList patientId={patientId} meds={data.meds} onChange={reload} />
            </Section>,
          )}
        </aside>
      </div>
    </div>
  )
}
