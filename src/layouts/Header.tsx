import { ArrowLeft, ChevronDown, History, LogOut, Menu, RotateCcw, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { homeFor } from '../auth/routing'
import { Avatar, EthicsBanner, IconButton, Logo, Modal, RoleSwitcher, Status, Tabs, type TabItem } from '../components'
import { counselorRepo, deadlineRepo, favoriteRepo } from '../db/repositories'
import { useRepo } from '../hooks/useRepo'
import { useToday } from '../hooks/useToday'
import { initials, shortName } from '../lib/text'
import type { PublicUser, Role } from '../types'
import { ResetDemoModal, SwitchAccountModal, SwitchSpaceModal } from './AccountModals'

const useRoleTabs = (user: PublicUser | null): TabItem[] => {
  const today = useToday()
  const isStudent = user?.role === 'lyceen'
  const { data: favoriteCount } = useRepo(
    async () => (isStudent ? (await favoriteRepo.listFavorites(user.id)).length : 0),
    [user?.id, isStudent],
  )
  const { data: deadlineCount } = useRepo(
    async () => (isStudent ? deadlineRepo.countPersonalUpcoming(user.id, today) : 0),
    [user?.id, isStudent, today.getTime()],
  )
  const { data: requestCount } = useRepo(
    async () => (user?.role === 'conseiller' && user.onboarded ? (await counselorRepo.listRequestsForCounselor(user.id)).length : 0),
    [user?.id, user?.role, user?.onboarded],
  )
  if (!user) return []
  if (user.role === 'conseiller') {
    return [
      { to: '/conseiller/demandes', label: 'Demandes', count: requestCount ?? 0 },
      { to: '/conseiller/eleves', label: 'Mes élèves' },
      { to: '/conseiller/decouverte', label: 'Découverte' },
    ]
  }
  if (user.role === 'etablissement') {
    return [
      { to: '/etablissement/fiches', label: 'Mes fiches' },
      { to: '/etablissement/chiffres', label: 'Chiffres d’intérêt' },
      { to: '/etablissement/page', label: 'Page de l’école' },
      { to: '/etablissement/profils', label: 'Profils intéressés' },
      { to: '/etablissement/decouverte', label: 'Découverte' },
    ]
  }
  return [
    { to: '/profil/interets', label: 'Mon profil', match: ['/profil'] },
    { to: '/pistes', label: 'Pistes suggérées', match: ['/formation'] },
    { to: '/comparer', label: 'Comparer' },
    { to: '/favoris', label: 'Favoris', count: favoriteCount ?? 0 },
    { to: '/rendez-vous', label: 'Rendez-vous', match: ['/echange'] },
    { to: '/echeances', label: 'Échéances', count: deadlineCount ?? 0 },
    { to: '/decouverte', label: 'Découverte', match: ['/ecole'] },
  ]
}

const displayName = (user: PublicUser) =>
  user.isGuest ? 'Invité' : user.role === 'etablissement' ? `${user.firstName} ${user.lastName}` : shortName(user.firstName, user.lastName)

const AccountMenu = ({ user, onSwitch, onReset }: { user: PublicUser; onSwitch: () => void; onReset: () => void }) => {
  const [open, setOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocument = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocument)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocument)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }} onBlur={(e) => !ref.current?.contains(e.relatedTarget) && setOpen(false)}>
      <button ref={buttonRef} type="button" className="account-button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        <Avatar size="sm" text={user.isGuest ? 'IN' : initials(user.firstName, user.lastName)} />
        <span className="account-name">{displayName(user)}</span>
        <span className="visually-hidden">: menu du compte</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="menu">
          <p className="small muted" style={{ padding: '4px 12px 8px' }}>
            {user.isGuest ? 'Mode invité : données sur cet appareil uniquement' : user.email}
          </p>
          {user.isGuest ? null : (
            <Link className="menu-item" to="/compte" onClick={() => setOpen(false)}>
              <History size={18} aria-hidden="true" />
              Mon compte et historique
            </Link>
          )}
          <button type="button" className="menu-item" onClick={choose(onSwitch)}>
            <Users size={18} aria-hidden="true" />
            Changer de compte
          </button>
          <button type="button" className="menu-item" onClick={choose(onReset)}>
            <RotateCcw size={18} aria-hidden="true" />
            Réinitialiser les données de démo
          </button>
          <button
            type="button"
            className="menu-item menu-item-danger"
            onClick={choose(async () => {
              await logout()
              navigate('/connexion', { state: { loggedOut: true } })
            })}
          >
            <LogOut size={18} aria-hidden="true" />
            {user.isGuest ? 'Quitter le mode invité' : 'Se déconnecter'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

interface HeaderProps {
  showTabs?: boolean
  /** Mobile : bouton « Retour » à la place du logo (fiche formation). */
  backTo?: string | null
}

export const Header = ({ showTabs = true, backTo }: HeaderProps) => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const tabs = useRoleTabs(user)
  const [spaceRole, setSpaceRole] = useState<Role | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [location.pathname])

  const selectRole = (role: Role) => {
    if (!user) {
      navigate('/connexion')
      return
    }
    if (role !== user.role) setSpaceRole(role)
    else navigate(homeFor(user))
  }

  const home = user ? homeFor(user) : '/connexion'

  return (
    <header className="site-header container">
      <div className="header-top">
        {backTo ? (
          <>
            <span className="desktop-only">
              <Logo to={home} />
            </span>
            <Link to={backTo} className="link-button mobile-only">
              <ArrowLeft size={18} aria-hidden="true" /> Retour
            </Link>
          </>
        ) : (
          <Logo to={home} />
        )}
        <div className="header-actions">
          <span className="desktop-only">
            <RoleSwitcher active={user?.role ?? null} onSelect={selectRole} />
          </span>
          {user?.isGuest ? (
            <span className="desktop-only">
              <Status tone="warning">Mode invité</Status>
            </span>
          ) : null}
          {user ? (
            <span className="desktop-only">
              <AccountMenu user={user} onSwitch={() => setSwitchOpen(true)} onReset={() => setResetOpen(true)} />
            </span>
          ) : (
            <Link className="btn btn-secondary desktop-only" to="/connexion">
              Se connecter
            </Link>
          )}
          <IconButton className="mobile-only" label="Ouvrir le menu" icon={<Menu size={20} aria-hidden="true" />} onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} />
        </div>
      </div>
      <EthicsBanner />
      {showTabs && tabs.length ? (
        <div className={user?.role === 'lyceen' ? 'desktop-only' : undefined}>
          <Tabs items={tabs} pathname={location.pathname} label={`Navigation de l’espace ${user?.role === 'lyceen' ? 'lycéen' : user?.role}`} />
        </div>
      ) : null}

      <Modal open={drawerOpen} title="Menu" onClose={() => setDrawerOpen(false)} closeLabel="Fermer le menu">
        <div className="drawer-section">
          <RoleSwitcher active={user?.role ?? null} onSelect={(role) => {
            setDrawerOpen(false)
            selectRole(role)
          }} />
        </div>
        {tabs.length ? (
          <nav className="drawer-section drawer-nav" aria-label="Pages de l’espace">
            {tabs.map((tab) => {
              const active = [tab.to, ...(tab.match ?? [])].some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))
              return (
                <Link key={tab.to} to={tab.to} aria-current={active ? 'page' : undefined}>
                  {tab.label}
                  {tab.count !== undefined ? ` (${tab.count})` : ''}
                </Link>
              )
            })}
          </nav>
        ) : null}
        {user ? (
          <div className="drawer-section stack-sm">
            <p className="small muted">{user.isGuest ? 'Mode invité : données sur cet appareil uniquement' : `${displayName(user)} · ${user.email}`}</p>
            {user.isGuest ? null : (
              <Link className="menu-item" to="/compte">
                <History size={18} aria-hidden="true" /> Mon compte et historique
              </Link>
            )}
            <button type="button" className="menu-item" onClick={() => { setDrawerOpen(false); setSwitchOpen(true) }}>
              <Users size={18} aria-hidden="true" /> Changer de compte
            </button>
            <button type="button" className="menu-item" onClick={() => { setDrawerOpen(false); setResetOpen(true) }}>
              <RotateCcw size={18} aria-hidden="true" /> Réinitialiser les données de démo
            </button>
            <LogoutItem guest={user.isGuest} />
          </div>
        ) : (
          <div className="drawer-section">
            <Link className="btn btn-primary btn-block" to="/connexion">
              Se connecter
            </Link>
          </div>
        )}
      </Modal>

      {spaceRole ? <SwitchSpaceModal role={spaceRole} onClose={() => setSpaceRole(null)} /> : null}
      <SwitchAccountModal open={switchOpen} onClose={() => setSwitchOpen(false)} />
      <ResetDemoModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </header>
  )
}

const LogoutItem = ({ guest }: { guest: boolean }) => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="menu-item menu-item-danger"
      onClick={async () => {
        await logout()
        navigate('/connexion', { state: { loggedOut: true } })
      }}
    >
      <LogOut size={18} aria-hidden="true" /> {guest ? 'Quitter le mode invité' : 'Se déconnecter'}
    </button>
  )
}
