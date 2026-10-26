import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Button, EmptyState, FavoriteToggle, LoadingState, Modal, useToast } from '../../components'
import { deadlineRepo, errorMessage, formationRepo } from '../../db/repositories'
import { useRepo } from '../../hooks/useRepo'
import { useComparisonIds, useFavoriteIds, useFormationActions, useOwnProfile } from '../../hooks/useStudent'
import { usePageTitle } from '../../hooks/usePageTitle'
import { scoreFormation } from '../../lib/scoring'
import type { PublicUser } from '../../types'
import { FormationDetail, OpenDayBox } from './FormationParts'
import { PistesPage } from './PistesPage'

const FormationModalContent = ({ user, id }: { user: PublicUser; id: string }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useToast()
  const formation = useRepo(() => formationRepo.getPublished(id), [id])
  const profile = useOwnProfile(user.id)
  const favorites = useFavoriteIds(user.id)
  const comparison = useComparisonIds(user.id)
  const actions = useFormationActions(user.id)
  usePageTitle(formation.data?.title ?? 'Fiche formation')

  const background = (location.state as { background?: { pathname: string; search?: string } } | null)?.background
  const close = () => navigate(background ? `${background.pathname}${background.search ?? ''}` : '/pistes')

  if (formation.loading || profile.loading) {
    return (
      <Modal open title="Fiche formation" onClose={close}>
        <LoadingState label="Chargement de la fiche…" />
      </Modal>
    )
  }
  if (!formation.data || !profile.data) {
    return (
      <Modal open title="Fiche introuvable" onClose={close}>
        <EmptyState title="Cette formation n’est plus publiée">
          Elle a peut-être été retirée par son établissement. Vos favoris et votre comparaison ne sont pas modifiés.
        </EmptyState>
        <Button onClick={close}>Retour aux pistes</Button>
      </Modal>
    )
  }

  const f = formation.data
  const score = scoreFormation(f, profile.data)
  const isFavorite = actions.isFavorite(f.id, favorites.data)
  const isCompared = actions.isCompared(f.id, comparison.data)
  const addOpenDay = async () => {
    try {
      const result = await deadlineRepo.addOpenDayFromFormation(user.id, f.id)
      notify(result.alreadyAdded ? 'Ces portes ouvertes sont déjà dans vos échéances.' : 'Portes ouvertes ajoutées à vos échéances.', result.alreadyAdded ? 'info' : 'success')
    } catch (error) {
      notify(errorMessage(error, 'L’échéance n’a pas pu être ajoutée. Réessayez.'), 'error')
    }
  }

  return (
    <Modal open overline={f.typeLong} title={f.title} onClose={close} size="wide" fullscreenOnMobile>
      <div className="stack">
        <FormationDetail formation={f} score={score} useGrades={profile.data.useGrades && Object.keys(profile.data.grades).length > 0} />
        <OpenDayBox formation={f} onAdd={() => void addOpenDay()} />
        <div className="mobile-actionbar cluster">
          <FavoriteToggle active={isFavorite} onToggle={() => void actions.toggleFavorite(f, isFavorite)} />
          <Button variant="secondary" onClick={() => void actions.toggleCompare(f, isCompared)} aria-pressed={isCompared}>
            {isCompared ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
          </Button>
          <Button variant="ghost" onClick={close}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Fiche formation en fenêtre modale (lycéen). */
export const FormationModal = () => {
  const { id } = useParams()
  const { user } = useAuth()
  if (!user || user.role !== 'lyceen' || !id) return null
  return <FormationModalContent user={user} id={id} />
}

/** Accès direct à /formation/:id : la fiche s'ouvre au-dessus des pistes. */
export const FormationRoute = () => (
  <>
    <PistesPage />
    <FormationModal />
  </>
)
