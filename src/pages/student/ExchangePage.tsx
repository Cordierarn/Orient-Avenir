import { CalendarDays, MessageCircle, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { useCurrentUser } from '../../auth/AuthContext'
import { Avatar, Button, CheckItem, EmptyState, IconChip, LinkButton, LoadingState, Modal, Status, useToast } from '../../components'
import { appointmentRepo, errorMessage, messageRepo } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatHour } from '../../lib/dates'
import type { PublicUser } from '../../types'
import { Conversation } from '../shared/Conversation'
import { GuestBlocked } from './AppointmentPage'

export const ExchangePage = () => {
  usePageTitle('Mon échange')
  const user = useCurrentUser()
  if (user.isGuest) return <GuestBlocked feature="La messagerie avec un conseiller" title="Échanger avec un conseiller" />
  return <Exchange user={user} />
}

const Exchange = ({ user }: { user: PublicUser }) => {
  const { notify } = useToast()
  const counselor = useRepo(() => messageRepo.getStudentCounselor(user.id), [user.id])
  const appointments = useRepo(() => appointmentRepo.listStudentAppointments(user.id), [user.id])
  const [moveOpen, setMoveOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  if (counselor.loading || appointments.loading) return <div className="container page"><LoadingState label="Chargement de votre échange…" /></div>
  if (!counselor.data) {
    return (
      <div className="container page">
        <div className="card">
          <EmptyState
            icon={<MessageCircle size={20} />}
            title="Votre échange n’est pas encore ouvert"
            action={
              <LinkButton to="/rendez-vous" arrow>
                Demander un rendez-vous
              </LinkButton>
            }
          >
            Il s’ouvrira dès qu’un conseiller aura accepté l’un de vos créneaux.
          </EmptyState>
        </div>
      </div>
    )
  }

  const first = counselor.data.name.split(' ')[0]
  const appointment = [...(appointments.data ?? [])].reverse().find((a) => a.counselorId === counselor.data!.id && a.status !== 'annule')
  const start = appointment ? new Date(appointment.startsAt) : null
  const minutesBefore = start ? (start.getTime() - Date.now()) / 60000 : Infinity
  const canJoin = appointment?.format === 'visio' && minutesBefore <= 10 && minutesBefore > -30

  const switchFormat = async () => {
    if (!appointment) return
    const next = appointment.format === 'visio' ? 'chat' : 'visio'
    try {
      await appointmentRepo.setAppointmentFormat(user.id, appointment.id, next)
      notify(next === 'chat' ? 'Le rendez-vous se fera par chat écrit, dans cet échange.' : 'Le rendez-vous se fera en visio.', 'success')
    } catch (e) {
      notify(errorMessage(e, 'Le format n’a pas pu être modifié. Réessayez.'), 'error')
    }
  }

  return (
    <div className="container page">
      <div className="page-header">
        <h1 className="h1">Mon échange avec {first}</h1>
        <p className="lead">Préparez le rendez-vous par écrit, puis rejoignez la visio à l’heure prévue.</p>
      </div>
      <div className="layout-aside">
        <section className="card card-lg stack" aria-labelledby="chat-title">
          <div className="spread">
            <div className="cluster">
              <Avatar text={counselor.data.initials} />
              <div>
                <h2 id="chat-title" className="h3">
                  {counselor.data.name}
                </h2>
                <p className="small muted">Votre conseiller · répond en général sous 24 h</p>
              </div>
            </div>
            <Status tone="success">Conseiller attitré</Status>
          </div>
          <Conversation ref={inputRef} actorId={user.id} otherId={counselor.data.id} otherFirstName={first} myFirstName={user.firstName} />
        </section>
        <aside className="card card-lg stack">
          <IconChip>
            <CalendarDays size={20} />
          </IconChip>
          {appointment && start ? (
            <>
              <h2 className="h2">
                {start.toLocaleDateString('fr-FR', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase())} {start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ·{' '}
                {formatHour(start)}
              </h2>
              <p className="small muted">
                {appointment.format === 'visio' ? 'Visio' : 'Chat écrit'} · {appointment.durationMinutes} minutes
                {appointment.status === 'termine' ? ' · entretien terminé' : ''}
              </p>
              {appointment.format === 'visio' ? (
                <>
                  <Button block arrow disabled={!canJoin} aria-describedby="visio-help" onClick={() => notify('Prototype : la visio n’est pas connectée à un service réel.', 'info')}>
                    Rejoindre la visio
                  </Button>
                  <p id="visio-help" className="small muted">
                    Le lien s’active 10 minutes avant le rendez-vous.
                  </p>
                </>
              ) : null}
              <Button variant="secondary" block onClick={() => void switchFormat()}>
                {appointment.format === 'visio' ? 'Passer en chat écrit' : 'Repasser en visio'}
              </Button>
              <Button variant="ghost" block onClick={() => setMoveOpen(true)}>
                Déplacer le rendez-vous
              </Button>
            </>
          ) : (
            <p className="small muted">Aucun rendez-vous planifié pour le moment.</p>
          )}
          <p className="small strong">Ce que {first} voit</p>
          <ul className="check-list">
            <CheckItem>Vos intérêts et préférences</CheckItem>
            <CheckItem>Vos favoris et vos notes</CheckItem>
            <CheckItem>Votre question pour l’entretien</CheckItem>
            <CheckItem ok={false}>Jamais vos moyennes</CheckItem>
          </ul>
          <p className="surface-2 small cluster" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <Users size={16} aria-hidden="true" className="accent" style={{ flex: 'none', marginTop: 2 }} />
            Vous gardez {first} pour la suite si ce premier échange vous convient. Sinon, vous pouvez demander un autre conseiller.
          </p>
        </aside>
      </div>
      <Modal
        open={moveOpen}
        title="Déplacer le rendez-vous"
        description={`Proposez un autre créneau à ${first} directement dans l’échange : il pourra l’accepter et vous confirmer la nouvelle date.`}
        onClose={() => setMoveOpen(false)}
        footer={
          <>
            <Button
              arrow
              onClick={() => {
                setMoveOpen(false)
                window.setTimeout(() => inputRef.current?.focus(), 0)
              }}
            >
              Écrire à {first}
            </Button>
            <Button variant="secondary" onClick={() => setMoveOpen(false)}>
              Annuler
            </Button>
          </>
        }
      />
    </div>
  )
}
