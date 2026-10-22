export type Role = 'lyceen' | 'conseiller' | 'etablissement'

export type CitySize = 'grande' | 'moyenne' | 'petite'

export type DurationPreference = 'court' | 'moyen' | 'long' | 'indifferent'

export type LearningStyle = 'theorique' | 'equilibre' | 'pratique'

export type Selectivity = 'acces ouvert' | 'selective' | 'tres selective'

export type ProgramType = 'BUT' | 'Licence' | 'BTS' | 'CPGE' | 'Ecole'

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

export interface Domain {
  id: DomainId
  label: string
}

export interface Repere {
  places: number
  candidats: number
  propositionRange: string
}

export interface Program {
  id: string
  nom: string
  type: ProgramType
  etablissement: string
  ville: string
  tailleVille: CitySize
  dureeAnnees: number
  selectivite: Selectivity
  alternance: boolean
  partPratique: number
  specialitesConseillees: string[]
  domainWeights: Record<DomainId, number>
  description: string
  debouches: string[]
  vigilance: string
  criteresExamen: Array<{ critere: string; poids: number }>
  repere: Repere
  maj: string
  portesOuvertes: string
}

export interface StudentProfile {
  interests: Record<DomainId, number>
  specialites: string[]
  cityPreference: CitySize | 'indifferent'
  durationPreference: DurationPreference
  learningStyle: LearningStyle
  alternancePreference: 'oui' | 'non' | 'indifferent'
  moyennes: Record<string, number>
  useGradesForRepere: boolean
}

export interface ScoringBreakdown {
  interests: number
  specialites: number
  preferences: number
}

export interface ProgramScore {
  programId: string
  score: number
  affinityDots: number
  breakdown: ScoringBreakdown
  explanation: string
  criteriaWeights: {
    interests: number
    specialites: number
    preferences: number
  }
  openingTrack: boolean
}

export interface AppState {
  role: Role
  student: StudentProfile
  favorites: Record<string, string>
  compareIds: string[]
  shareWithCounselor: boolean
  visibleToSchools: boolean
  remindersEnabled: boolean
  selectedOpenDays: string[]
  liveMessage: string
  messages: Array<{ id: string; from: 'lyceen' | 'conseiller'; text: string; at: string }>
  appointment?: {
    advisor: string
    slot: string
    format: 'visio' | 'chat' | 'peu importe'
    message: string
  }
}
