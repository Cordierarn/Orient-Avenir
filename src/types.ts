export type Role = 'lyceen' | 'conseiller' | 'etablissement'

export type DomainId =
  | 'numerique'
  | 'sciences'
  | 'concevoir'
  | 'sante'
  | 'social'
  | 'gestion'
  | 'creation'
  | 'langues'
  | 'environnement'

/** Niveau d'intérêt : 1 Pas du tout … 5 Passionnément. */
export type Level = 1 | 2 | 3 | 4 | 5

export type CityPreference = 'grande' | 'moyenne' | 'petite' | 'indifferent'
export type CitySize = 'grande' | 'moyenne' | 'petite'
export type DurationPreference = '2' | '3' | '5+' | 'inconnu'
export type LearningPreference = 'pratique' | 'equilibree' | 'theorique'
export type Selectivity = 'acces-ouvert' | 'selective' | 'tres-selective'
export type Sector = 'public' | 'prive'
export type FormationStatus = 'brouillon' | 'publiee'
export type FormationType =
  | 'BUT'
  | 'BTS'
  | 'Licence'
  | 'École d’ingénieurs'
  | 'Bachelor'
  | 'CPGE'
  | 'Formation en soins infirmiers'

export interface Domain {
  id: DomainId
  label: string
  short: string
}

// ---------------------------------------------------------------------------
// Comptes et sessions
// ---------------------------------------------------------------------------

export interface PasswordCredential {
  algorithm: 'PBKDF2-SHA-256'
  iterations: number
  /** Sel aléatoire (base64), propre au compte. */
  salt: string
  /** Résultat dérivé (base64). */
  hash: string
}

export interface User {
  id: string
  /** E-mail normalisé (minuscules, sans espaces). Sert à l'authentification uniquement. */
  email: string
  firstName: string
  lastName: string
  role: Role
  credential: PasswordCredential | null
  isDemo: boolean
  isGuest: boolean
  /** Rattachement d'un compte établissement. */
  institutionId?: string
  /** Parcours de première connexion terminé (conseiller, établissement). */
  onboarded: boolean
  createdAt: string
}

/** Vue d'un compte sans aucune donnée d'authentification. */
export type PublicUser = Omit<User, 'credential'>

export interface Session {
  id: string
  userId: string
  persistent: boolean
  createdAt: string
  lastSeenAt: string
  revokedAt?: string
}

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

export interface Grades {
  [subject: string]: number
}

export interface StudentProfile {
  userId: string
  classe: string
  interests: Partial<Record<DomainId, Level>>
  specialites: string[]
  city?: CityPreference
  duration?: DurationPreference
  learning?: LearningPreference
  alternance: boolean
  /** Moyennes : strictement privées, jamais projetées vers un autre rôle. */
  grades: Grades
  useGrades: boolean
  completedSteps: number[]
  /** Phrase simplifiée visible des établissements si l'élève l'accepte. */
  publicSummary?: string
  /** Questions posées aux établissements (profil simplifié). */
  questions?: string
  updatedAt: string
}

export interface CounselorProfile {
  userId: string
  title: string
  domains: DomainId[]
  tags: string[]
  availability: string
  formats: Array<'visio' | 'chat'>
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Établissements et formations
// ---------------------------------------------------------------------------

export interface Testimonial {
  initials: string
  name: string
  path: string
  quote: string
}

export interface InstitutionEvent {
  id: string
  date: string
  endDate?: string
  title: string
  subtitle: string
  kind: 'Forum' | 'Salon' | 'Portes ouvertes' | 'Immersion'
}

export interface Institution {
  id: string
  name: string
  shortName: string
  kind: string
  city: string
  citySize: CitySize
  distanceKm: number
  sector: Sector
  studentsCount?: number
  tagline?: string
  testimonials: Testimonial[]
  events: InstitutionEvent[]
  updatedAt: string
  updatedBy?: string
}

export interface ExamCriterion {
  label: string
  /** Poids en pourcentage, total de 100 par formation. */
  weight: number
}

export interface InterestBaseline {
  favorites: number
  comparisons: number
  trend: 'hausse' | 'stable' | 'baisse'
}

export interface Formation {
  id: string
  institutionId: string
  title: string
  typeShort: FormationType
  typeLong: string
  admissionLevel: 'post-bac' | 'bac+2'
  durationYears: number
  durationLabel: string
  selectivity: Selectivity
  selectivityLabel: string
  alternance: boolean
  alternanceLabel: string
  practicePercent: number
  learningLabel: string
  specialites: string[]
  /** Poids de chaque domaine pour la formation, de 0 à 1. */
  domainWeights: Partial<Record<DomainId, number>>
  tags: DomainId[]
  summary: string
  outcomes: string
  vigilance: string
  criteria: ExamCriterion[]
  criteriaSummary: string
  places: number
  candidates: number
  closeProfilesRange: string
  cost: string
  /** Prérequis affichés sur la page de l'école. */
  prerequisites?: string
  /** Durée courte affichée sur la page de l'école (ex. « 2 + 3 ans »). */
  durationShort?: string
  openDay?: { date: string; details: string }
  keywords: string[]
  status: FormationStatus
  updatedAt: string
  publishedAt?: string
  /** Chiffres agrégés et anonymes antérieurs au prototype (fictifs). */
  interestBaseline?: InterestBaseline
}

export interface FormationView extends Formation {
  institution: Pick<Institution, 'id' | 'name' | 'shortName' | 'city' | 'citySize' | 'distanceKm' | 'sector'>
}

// ---------------------------------------------------------------------------
// Activité du lycéen
// ---------------------------------------------------------------------------

export interface Favorite {
  id: string
  userId: string
  formationId: string
  note: string
  addedAt: string
}

export interface Comparison {
  userId: string
  formationIds: string[]
  updatedAt: string
}

export type ShareAudience = 'conseiller' | 'etablissements'

export interface Share {
  id: string
  studentId: string
  audience: ShareAudience
  active: boolean
  grantedAt?: string
  revokedAt?: string
}

export type RequestStatus = 'en_attente' | 'acceptee' | 'refusee' | 'annulee'
export type ExchangeFormat = 'visio' | 'chat' | 'indifferent'

export interface AppointmentRequest {
  id: string
  studentId: string
  preferredCounselorId: string | null
  slots: string[]
  format: ExchangeFormat
  topic: string
  status: RequestStatus
  declinedBy: string[]
  createdAt: string
  updatedAt: string
  acceptedBy?: string
  acceptedSlot?: string
  appointmentId?: string
}

export interface Appointment {
  id: string
  requestId: string
  studentId: string
  counselorId: string
  startsAt: string
  format: 'visio' | 'chat'
  durationMinutes: number
  status: 'planifie' | 'termine' | 'annule'
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  body: string
  sentAt: string
}

export type FollowStatus = 'a_contacter' | 'rdv_demande' | 'entretien_planifie' | 'suivi_en_cours'

export interface CounselorNote {
  id: string
  counselorId: string
  studentId: string
  body: string
  followStatus?: FollowStatus
  updatedAt: string
}

export type DeadlineBadge = 'officiel' | 'favori' | 'important' | 'delai-court' | 'urgent' | 'invitation'

export interface Deadline {
  id: string
  /** null : échéance officielle commune à tous les lycéens. */
  ownerId: string | null
  date: string
  endDate?: string
  title: string
  subtitle: string
  badge: DeadlineBadge
  formationId?: string
  institutionEventId?: string
  createdAt: string
}

export interface ReminderSettings {
  userId: string
  sevenDays: boolean
  dayBefore: boolean
  phone: boolean
  email: boolean
  /** Date du jour simulée (AAAA-MM-JJ) pour la démonstration. */
  simulatedToday: string | null
  updatedAt: string
}

export type ActivityType =
  | 'connexion'
  | 'deconnexion'
  | 'inscription'
  | 'partage_accorde'
  | 'partage_retire'
  | 'visibilite_accordee'
  | 'visibilite_retiree'
  | 'rdv_demande'
  | 'rdv_accepte'
  | 'rdv_laisse'
  | 'rdv_annule'
  | 'fiche_publiee'
  | 'invitation'
  | 'reinitialisation'

export interface ActivityEntry {
  id: string
  /** Compte qui voit l'entrée dans son historique. */
  userId: string
  actorId: string
  actorName: string
  type: ActivityType
  description: string
  at: string
}

export interface MetaEntry {
  key: string
  value: string | number
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreComponent {
  /** Valeur de la composante sur 5. */
  value: number
  /** true si les réponses manquent : valeur neutre utilisée. */
  missing: boolean
  explanation: string
}

export interface FormationScore {
  formationId: string
  /** Affinité sur 5, bornée entre 0 et 5. */
  score: number
  dots: number
  interests: ScoreComponent
  specialites: ScoreComponent
  preferences: ScoreComponent
  /** Part de chaque critère dans l'affinité (total 100). */
  shares: { interests: number; specialites: number; preferences: number }
}
