import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { homeFor, isPathAllowed, roleForPath } from '../auth/routing'
import { Button, LinkButton, LoadingState, MobileTabBar, ROLE_LABELS, useToast } from '../components'
import { deadlineRepo } from '../db/repositories'
import { useRepo } from '../hooks/useRepo'
import { useToday } from '../hooks/useToday'
import { formatShortDate } from '../lib/dates'
import type { PublicUser } from '../types'
import { SwitchSpaceModal } from './AccountModals'
import { Header } from './Header'

/** Notifications internes : un rappel par échéance et par session, selon les réglages du lycéen. */
const ReminderNotifier = ({ user }: { user: PublicUser }) => {
  const { notify } = useToast()
  const today = useToday()
  const { data } = useRepo(async () => {
    const [deadlines, settings] = await Promise.all([deadlineRepo.listDeadlines(user.id), deadlineRepo.getReminders(user.id)])
    return deadlineRepo.computeDueReminders(deadlines, settings, today)
  }, [user.id, today.getTime()])
  useEffect(() => {
    if (!data) return
    const key = `orient-avenir.notified.${user.id}`
    let seen: string[] = []
    try {
      seen = JSON.parse(sessionStorage.getItem(key) ?? '[]')
    } catch {
      seen = []
    }
    const fresh = data.filter((d) => !seen.includes(`${d.deadline.id}:${today.toDateString()}`))
    for (const { deadline, daysLeft } of fresh.slice(0, 2)) {
      const when = daysLeft === 0 ? 'aujourd’hui' : daysLeft === 1 ? 'demain' : `dans ${daysLeft} jours`
      notify(`Rappel : « ${deadline.title} » ${when} (${formatShortDate(deadline.date)}). Détails dans « Échéances ».`, 'info')
    }
    try {
      sessionStorage.setItem(key, JSON.stringify([...seen, ...fresh.map((d) => `${d.deadline.id}:${today.toDateString()}`)]))
    } catch {
      // Stockage indisponible : le rappel pourra réapparaître, sans conséquence.
    }
  }, [data, notify, user.id, today])
  return null
}

const usePathFocus = () => {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [location.pathname])
  return mainRef
}

/** Coquille commune des pages connectées : en-tête, bandeau éthique, onglets, barre mobile. */
export const AppShell = ({ children }: { children?: React.ReactNode }) => {
  const { user } = useAuth()
  const location = useLocation()
  const mainRef = usePathFocus()
  const isStudent = user?.role === 'lyceen'
  const showTabs = !(isStudent && location.pathname === '/')
  const backTo = location.pathname.startsWith('/formation/') ? '/pistes' : null

  return (
    <div className={isStudent ? 'has-tabbar' : undefined}>
      <a
        className="skip-link"
        href="#contenu"
        onClick={(event) => {
          event.preventDefault()
          mainRef.current?.focus()
        }}
      >
        Aller au contenu
      </a>
      <Header showTabs={showTabs} backTo={backTo} />
      <main id="contenu" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        {children ?? <Outlet />}
      </main>
      {isStudent ? <MobileTabBar pathname={location.pathname} /> : null}
      {isStudent && user ? <ReminderNotifier user={user} /> : null}
    </div>
  )
}

/** Route protégée : sans session, redirection vers /connexion en conservant la route demandée. */
export const RequireAuth = () => {
  const { user, pending } = useAuth()
  const location = useLocation()
  if (pending) {
    return (
      <div className="container page">
        <LoadingState label="Ouverture de votre espace…" />
      </div>
    )
  }
  if (!user) return <Navigate to="/connexion" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <Outlet />
}

/** Mauvais rôle : la page n'est pas rendue et aucune donnée n'est lue ; on propose « Changer d'espace ». */
const WrongSpace = ({ user, required }: { user: PublicUser; required: NonNullable<ReturnType<typeof roleForPath>> }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="container page">
      <div className="card card-lg stack" style={{ maxWidth: 640 }}>
        <h1 className="h1">Cet espace est réservé aux comptes {ROLE_LABELS[required].toLowerCase()}</h1>
        <p className="muted">
          Vous êtes connecté en tant que {ROLE_LABELS[user.role].toLowerCase()}. Pour ouvrir cette page, changez d’espace avec un compte adapté. Vos données restent
          enregistrées.
        </p>
        <div className="cluster">
          <Button arrow onClick={() => setOpen(true)}>
            Changer d’espace
          </Button>
          <LinkButton to={homeFor(user)} variant="secondary">
            Retour à mon espace
          </LinkButton>
        </div>
      </div>
      {open ? <SwitchSpaceModal role={required} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

export const RoleGate = () => {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return null
  if (!isPathAllowed(location.pathname, user.role)) return <WrongSpace user={user} required={roleForPath(location.pathname)!} />
  // Parcours de première connexion.
  if (user.role === 'conseiller' && !user.onboarded && location.pathname !== '/conseiller/profil') return <Navigate to="/conseiller/profil" replace />
  if (user.role === 'etablissement' && !user.institutionId && location.pathname !== '/etablissement/rattachement')
    return <Navigate to="/etablissement/rattachement" replace />
  return <Outlet />
}
