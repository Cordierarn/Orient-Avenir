import { Route, Routes, useLocation, type Location } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Alert, Button, LoadingState } from './components'
import { AppShell, RequireAuth, RoleGate } from './layouts/AppShell'
import { CounselorProfilePage } from './pages/counselor/CounselorProfilePage'
import { RequestsPage } from './pages/counselor/RequestsPage'
import { StudentsPage } from './pages/counselor/StudentsPage'
import { FichesPage } from './pages/institution/FichesPage'
import { ChiffresPage, InstitutionOnboardingPage, ProfilesPage, SchoolPreviewPage } from './pages/institution/InstitutionPages'
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage'
import { LoginPage } from './pages/public/LoginPage'
import { NotFoundPage } from './pages/public/NotFoundPage'
import { RegisterPage } from './pages/public/RegisterPage'
import { AccountPage } from './pages/shared/AccountPage'
import { DiscoveryPage } from './pages/shared/DiscoveryPage'
import { SchoolPage } from './pages/shared/SchoolPage'
import { AppointmentPage } from './pages/student/AppointmentPage'
import { ComparePage } from './pages/student/ComparePage'
import { DeadlinesPage } from './pages/student/DeadlinesPage'
import { ExchangePage } from './pages/student/ExchangePage'
import { FavoritesPage } from './pages/student/FavoritesPage'
import { FormationModal, FormationRoute } from './pages/student/FormationModal'
import { HomePage } from './pages/student/HomePage'
import { PistesPage } from './pages/student/PistesPage'
import { DossierPage, InterestsPage, PreferencesPage } from './pages/student/ProfilePages'

/** Routes internes (React Router, HashRouter) : /connexion est servie sous /#/connexion. */
const App = () => {
  const { boot, bootError } = useAuth()
  const location = useLocation()
  // Fiche formation ouverte depuis une page : la page d'origine reste affichée sous la fenêtre.
  const background = (location.state as { background?: Location } | null)?.background

  if (boot === 'loading') {
    return (
      <div className="container page">
        <LoadingState label="Ouverture de la base locale…" />
      </div>
    )
  }
  if (boot === 'error') {
    return (
      <div className="container page">
        <Alert tone="error" title="La base locale n’a pas pu s’ouvrir" role="alert">
          {bootError instanceof Error ? `${bootError.message}. ` : ''}Ce navigateur bloque peut-être IndexedDB (navigation privée stricte, stockage désactivé). Aucune donnée n’a été
          perdue : autorisez le stockage du site puis rechargez.
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => window.location.reload()}>Recharger</Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <Routes location={background ?? location}>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route element={<RoleGate />}>
              {/* Lycéen */}
              <Route path="/" element={<HomePage />} />
              <Route path="/profil/interets" element={<InterestsPage />} />
              <Route path="/profil/preferences" element={<PreferencesPage />} />
              <Route path="/profil/dossier" element={<DossierPage />} />
              <Route path="/pistes" element={<PistesPage />} />
              <Route path="/formation/:id" element={<FormationRoute />} />
              <Route path="/comparer" element={<ComparePage />} />
              <Route path="/favoris" element={<FavoritesPage />} />
              <Route path="/rendez-vous" element={<AppointmentPage />} />
              <Route path="/echange" element={<ExchangePage />} />
              <Route path="/echeances" element={<DeadlinesPage />} />
              <Route path="/decouverte" element={<DiscoveryPage />} />
              {/* Conseiller */}
              <Route path="/conseiller/demandes" element={<RequestsPage />} />
              <Route path="/conseiller/eleves" element={<StudentsPage />} />
              <Route path="/conseiller/eleves/:id" element={<StudentsPage />} />
              <Route path="/conseiller/decouverte" element={<DiscoveryPage />} />
              <Route path="/conseiller/profil" element={<CounselorProfilePage />} />
              {/* Établissement */}
              <Route path="/etablissement/fiches" element={<FichesPage />} />
              <Route path="/etablissement/chiffres" element={<ChiffresPage />} />
              <Route path="/etablissement/page" element={<SchoolPreviewPage />} />
              <Route path="/etablissement/profils" element={<ProfilesPage />} />
              <Route path="/etablissement/decouverte" element={<DiscoveryPage />} />
              <Route path="/etablissement/rattachement" element={<InstitutionOnboardingPage />} />
              {/* Tous les rôles */}
              <Route path="/compte" element={<AccountPage />} />
              <Route path="/ecole/:id" element={<SchoolPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {background ? (
        <Routes>
          <Route path="/formation/:id" element={<FormationModal />} />
        </Routes>
      ) : null}
    </>
  )
}

export default App
