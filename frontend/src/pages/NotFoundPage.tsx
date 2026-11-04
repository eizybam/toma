import { PageMessage } from '@/components/PageMessage'
import { ButtonLink } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <PageMessage title="No encontramos esta página" body="Revisa el enlace e inténtalo otra vez.">
      <ButtonLink to="/demo">Ir al inicio</ButtonLink>
    </PageMessage>
  )
}
