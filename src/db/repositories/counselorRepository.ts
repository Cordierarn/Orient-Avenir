import { db } from '../database'
import { domains, strongDomains } from '../../data/domains'
import { interviewQuestions, talkingPoints } from '../../lib/dossier'
import { nowIso } from '../../lib/ids'
import { initials } from '../../lib/text'
import type { Appointment, AppointmentRequest, CounselorNote, CounselorProfile, DomainId, FollowStatus, FormationView, Level } from '../../types'
import { AccessDeniedError, ValidationError } from './errors'
import { counselorHasAccess, displayName, requireAccount } from './internal'
import { getPublishedMany } from './formationRepository'
import { toSharedProfile, type SharedStudentProfile } from './studentRepository'

// ---------------------------------------------------------------------------
// Profils conseillers (publics)
// ---------------------------------------------------------------------------

export interface CounselorCard {
  id: string
  name: string
  initials: string
  title: string
  tags: string[]
  availability: string
  domains: DomainId[]
}

export const listCounselors = async (): Promise<CounselorCard[]> => {
  const profiles = await db.counselorProfiles.toArray()
  const users = new Map((await db.users.where('role').equals('conseiller').toArray()).map((u) => [u.id, u]))
  return profiles.flatMap((p) => {
    const user = users.get(p.userId)
    if (!user || !p.title) return []
    return [
      {
        id: user.id,
        name: displayName(user),
        initials: initials(user.firstName, user.lastName),
        title: p.title,
        tags: p.tags,
        availability: p.availability,
        domains: p.domains,
      },
    ]
  })
}

export const getOwnCounselorProfile = async (actorId: string): Promise<CounselorProfile | null> => {
  await requireAccount(actorId, 'conseiller')
  return (await db.counselorProfiles.get(actorId)) ?? null
}

export interface CounselorProfileInput {
  title: string
  domains: DomainId[]
  tags: string[]
  availability: string
  formats: Array<'visio' | 'chat'>
}

export const validateCounselorProfile = (input: CounselorProfileInput) => {
  const errors: Partial<Record<keyof CounselorProfileInput, string>> = {}
  if (!input.title.trim()) errors.title = 'Présentez votre parcours en une phrase, par exemple « Conseiller d’orientation indépendant ».'
  if (!input.domains.length) errors.domains = 'Choisissez au moins un domaine dans lequel vous accompagnez des élèves.'
  if (!input.availability.trim()) errors.availability = 'Indiquez vos disponibilités habituelles, par exemple « En soirée ».'
  if (!input.formats.length) errors.formats = 'Choisissez au moins un format d’échange.'
  return errors
}

export const saveCounselorProfile = async (actorId: string, input: CounselorProfileInput) => {
  await requireAccount(actorId, 'conseiller')
  const errors = validateCounselorProfile(input)
  if (Object.keys(errors).length) throw new ValidationError('Votre profil est incomplet.', errors)
  await db.transaction('rw', [db.counselorProfiles, db.users], async () => {
    await db.counselorProfiles.put({ userId: actorId, ...input, title: input.title.trim(), availability: input.availability.trim(), updatedAt: nowIso() })
    await db.users.update(actorId, { onboarded: true })
  })
}

// ---------------------------------------------------------------------------
// Demandes et élèves : uniquement les données partagées, jamais les moyennes.
// ---------------------------------------------------------------------------

const followLabels: Record<FollowStatus, string> = {
  a_contacter: 'À contacter',
  rdv_demande: 'Rendez-vous demandé',
  entretien_planifie: 'Entretien planifié',
  suivi_en_cours: 'Suivi en cours',
}
export const FOLLOW_STATUSES = Object.entries(followLabels).map(([value, label]) => ({ value: value as FollowStatus, label }))
export const followLabel = (status: FollowStatus) => followLabels[status]

export interface SharedStudentSummary {
  id: string
  name: string
  firstName: string
  initials: string
  classe: string
  specialites: string[]
  strongInterests: string[]
  favoriteTitles: string[]
}

const summarize = async (studentId: string): Promise<SharedStudentSummary | null> => {
  const [user, profile] = await Promise.all([db.users.get(studentId), db.studentProfiles.get(studentId)])
  if (!user || !profile) return null
  const favorites = await db.favorites.where('userId').equals(studentId).toArray()
  const formations = await getPublishedMany(favorites.map((f) => f.formationId))
  return {
    id: user.id,
    name: displayName(user),
    firstName: user.firstName,
    initials: initials(user.firstName, user.lastName),
    classe: profile.classe,
    specialites: profile.specialites,
    strongInterests: strongDomains(profile.interests).map((d) => d.label),
    favoriteTitles: formations.map((f) => f.title),
  }
}

export interface CounselorRequestView {
  request: AppointmentRequest
  student: SharedStudentSummary
  match: { matches: boolean; label: string }
}

const matchLabel = (studentInterests: Partial<Record<DomainId, Level>>, profile: CounselorProfile | undefined, favorites: string[]) => {
  if (!profile) return { matches: false, label: 'Hors de vos domaines' }
  const strong = strongDomains(studentInterests).map((d) => d.id)
  const common = profile.domains.filter((d) => strong.includes(d))
  if (common.length) {
    const first = domains.find((d) => d.id === common[0])!
    return { matches: true, label: `Correspond à vos domaines : ${first.short}` }
  }
  const tag = profile.tags.find((t) => favorites.some((f) => /ingénieur/i.test(f) && /ingénieur/i.test(t)))
  return tag ? { matches: true, label: `Correspond : ${tag.toLowerCase()}` } : { matches: false, label: 'Hors de vos domaines' }
}

/** Demandes en attente visibles par ce conseiller (consentement actif obligatoire). */
export const listRequestsForCounselor = async (counselorId: string): Promise<CounselorRequestView[]> => {
  await requireAccount(counselorId, 'conseiller')
  const profile = await db.counselorProfiles.get(counselorId)
  const pending = await db.appointmentRequests.where('status').equals('en_attente').toArray()
  const views: CounselorRequestView[] = []
  for (const request of pending.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!(await counselorHasAccess(counselorId, request.studentId))) continue
    const student = await summarize(request.studentId)
    const studentProfile = await db.studentProfiles.get(request.studentId)
    if (!student || !studentProfile) continue
    views.push({ request, student, match: matchLabel(studentProfile.interests, profile, student.favoriteTitles) })
  }
  return views
}

export interface CounselorStudentListItem extends SharedStudentSummary {
  status: FollowStatus
  statusLabel: string
  sharedAt?: string
}

const deriveStatus = (note: CounselorNote | undefined, requests: AppointmentRequest[], appointments: Appointment[], counselorId: string): FollowStatus => {
  if (note?.followStatus) return note.followStatus
  if (appointments.some((a) => a.counselorId === counselorId && a.status === 'planifie')) return 'entretien_planifie'
  if (requests.some((r) => r.status === 'en_attente')) return 'rdv_demande'
  if (appointments.some((a) => a.counselorId === counselorId)) return 'suivi_en_cours'
  return 'a_contacter'
}

/** Élèves ayant partagé leur dossier et liés à ce conseiller. */
export const listStudentsForCounselor = async (counselorId: string): Promise<CounselorStudentListItem[]> => {
  await requireAccount(counselorId, 'conseiller')
  const shares = await db.shares.where('audience').equals('conseiller').filter((s) => s.active).toArray()
  const items: CounselorStudentListItem[] = []
  for (const share of shares) {
    if (!(await counselorHasAccess(counselorId, share.studentId))) continue
    const summary = await summarize(share.studentId)
    if (!summary) continue
    const [note, requests, appointments] = await Promise.all([
      db.counselorNotes.get(`${counselorId}:${share.studentId}`),
      db.appointmentRequests.where('studentId').equals(share.studentId).toArray(),
      db.appointments.where('studentId').equals(share.studentId).toArray(),
    ])
    const status = deriveStatus(note, requests, appointments, counselorId)
    items.push({ ...summary, status, statusLabel: followLabels[status], sharedAt: share.grantedAt })
  }
  return items.sort((a, b) => (b.sharedAt ?? '').localeCompare(a.sharedAt ?? ''))
}

export interface CounselorDossier {
  student: SharedStudentSummary
  profile: SharedStudentProfile
  sharedAt?: string
  favorites: Array<{ formation: FormationView; note: string }>
  compared: FormationView[]
  pendingRequest: AppointmentRequest | null
  appointment: Appointment | null
  note: CounselorNote | null
  status: FollowStatus
  statusLabel: string
  talkingPoints: string[]
  questions: string[]
}

/**
 * Dossier d'un élève vu par un conseiller : refusé sans consentement actif.
 * La projection exclut toujours les moyennes.
 */
export const getStudentDossier = async (counselorId: string, studentId: string): Promise<CounselorDossier> => {
  await requireAccount(counselorId, 'conseiller')
  if (!(await counselorHasAccess(counselorId, studentId))) {
    throw new AccessDeniedError('Ce dossier n’est pas accessible : l’élève ne l’a pas partagé avec vous ou a retiré son accord.')
  }
  const [summary, profile, share, favorites, comparison, requests, appointments, note] = await Promise.all([
    summarize(studentId),
    db.studentProfiles.get(studentId),
    db.shares.get(`${studentId}:conseiller`),
    db.favorites.where('userId').equals(studentId).toArray(),
    db.comparisons.get(studentId),
    db.appointmentRequests.where('studentId').equals(studentId).toArray(),
    db.appointments.where('studentId').equals(studentId).toArray(),
    db.counselorNotes.get(`${counselorId}:${studentId}`),
  ])
  if (!summary || !profile) throw new AccessDeniedError('Ce dossier n’existe plus.')
  const favoriteFormations = new Map((await getPublishedMany(favorites.map((f) => f.formationId))).map((f) => [f.id, f]))
  const compared = await getPublishedMany(comparison?.formationIds ?? [])
  const shared = toSharedProfile(profile)
  const favoriteViews = favorites.flatMap((f) => {
    const formation = favoriteFormations.get(f.formationId)
    return formation ? [{ formation, note: f.note }] : []
  })
  const mine = appointments.filter((a) => a.counselorId === counselorId).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const status = deriveStatus(note, requests, appointments, counselorId)
  const input = {
    firstName: summary.firstName,
    interests: shared.interests,
    specialites: shared.specialites,
    favorites: favoriteViews.map((f) => f.formation),
    compared,
    alternance: shared.alternance,
  }
  return {
    student: summary,
    profile: shared,
    sharedAt: share?.grantedAt,
    favorites: favoriteViews,
    compared,
    pendingRequest: requests.find((r) => r.status === 'en_attente') ?? null,
    appointment: mine.find((a) => a.status === 'planifie') ?? mine[0] ?? null,
    note: note ?? null,
    status,
    statusLabel: followLabels[status],
    talkingPoints: talkingPoints(input),
    questions: interviewQuestions(input),
  }
}

export const saveNote = async (counselorId: string, studentId: string, body: string, followStatus?: FollowStatus) => {
  await requireAccount(counselorId, 'conseiller')
  if (!(await counselorHasAccess(counselorId, studentId))) {
    throw new AccessDeniedError('Note non enregistrée : l’élève a retiré son partage. Votre saisie reste affichée.')
  }
  if (body.length > 2000) throw new ValidationError('La note dépasse 2 000 caractères : raccourcissez-la pour l’enregistrer.')
  const id = `${counselorId}:${studentId}`
  const current = await db.counselorNotes.get(id)
  const note: CounselorNote = {
    id,
    counselorId,
    studentId,
    body,
    followStatus: followStatus ?? current?.followStatus,
    updatedAt: nowIso(),
  }
  await db.counselorNotes.put(note)
  return note
}

export interface CounselorStats {
  pendingCount: number
  followedCount: number
}

export const getCounselorStats = async (counselorId: string): Promise<CounselorStats> => {
  const [requests, students] = await Promise.all([listRequestsForCounselor(counselorId), listStudentsForCounselor(counselorId)])
  return {
    pendingCount: requests.length,
    followedCount: students.filter((s) => s.status === 'entretien_planifie' || s.status === 'suivi_en_cours').length,
  }
}
