import type {
  ActivityEntry,
  Appointment,
  AppointmentRequest,
  Comparison,
  CounselorNote,
  Deadline,
  Favorite,
  ReminderSettings,
  Share,
} from '../../types'
import { DEMO_IDS } from './accounts'

const { lea, gabriel } = DEMO_IDS
const anonymous = Array.from({ length: 7 }, (_, i) => `u-eleve-${String(i + 1).padStart(2, '0')}`)

export const seedFavorites: Favorite[] = [
  {
    id: 'fav-lea-but-info',
    userId: lea,
    formationId: 'f-but-info',
    note: 'J’aime les projets en équipe. Vérifier le niveau de maths attendu en première année.',
    addedAt: '2026-10-18T17:30:00.000Z',
  },
  {
    id: 'fav-lea-licence-info',
    userId: lea,
    formationId: 'f-licence-info',
    note: 'Plus théorique que le BUT. Demander l’emploi du temps type et le taux de réussite en première année.',
    addedAt: '2026-10-19T18:10:00.000Z',
  },
  { id: 'fav-yanis-gmp', userId: 'u-yanis', formationId: 'f-but-gmp', note: '', addedAt: '2026-10-15T10:00:00.000Z' },
  { id: 'fav-yanis-cycle', userId: 'u-yanis', formationId: 'f-cycle-ingenieur', note: '', addedAt: '2026-10-15T10:05:00.000Z' },
  { id: 'fav-ines-ifsi', userId: 'u-ines', formationId: 'f-ifsi', note: '', addedAt: '2026-10-12T10:00:00.000Z' },
  { id: 'fav-ines-sv', userId: 'u-ines', formationId: 'f-licence-sv', note: '', addedAt: '2026-10-12T10:05:00.000Z' },
  { id: 'fav-noe-droit', userId: 'u-noe', formationId: 'f-licence-droit', note: '', addedAt: '2026-10-08T10:00:00.000Z' },
  { id: 'fav-jeanne-cycle', userId: 'u-jeanne', formationId: 'f-cycle-ingenieur', note: '', addedAt: '2026-10-16T10:00:00.000Z' },
  ...anonymous.map((userId, i) => ({
    id: `fav-${userId}-cycle`,
    userId,
    formationId: 'f-cycle-ingenieur',
    note: '',
    addedAt: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`,
  })),
]

export const seedComparisons: Comparison[] = [
  { userId: lea, formationIds: ['f-but-info', 'f-licence-info', 'f-cycle-ingenieur'], updatedAt: '2026-10-20T16:00:00.000Z' },
]

export const seedShares: Share[] = [
  { id: `${lea}:conseiller`, studentId: lea, audience: 'conseiller', active: true, grantedAt: '2026-10-20T16:30:00.000Z' },
  { id: `${lea}:etablissements`, studentId: lea, audience: 'etablissements', active: true, grantedAt: '2026-10-20T16:30:00.000Z' },
  ...['u-yanis', 'u-ines', 'u-noe'].map((studentId) => ({
    id: `${studentId}:conseiller`,
    studentId,
    audience: 'conseiller' as const,
    active: true,
    grantedAt: '2026-10-14T09:00:00.000Z',
  })),
  ...['u-yanis', 'u-jeanne', ...anonymous].map((studentId) => ({
    id: `${studentId}:etablissements`,
    studentId,
    audience: 'etablissements' as const,
    active: true,
    grantedAt: '2026-10-14T09:00:00.000Z',
  })),
]

export const seedRequests: AppointmentRequest[] = [
  {
    id: 'req-lea',
    studentId: lea,
    preferredCounselorId: gabriel,
    slots: ['2026-11-04T12:00:00', '2026-11-05T17:00:00', '2026-11-06T18:00:00'],
    format: 'visio',
    topic: 'Je n’arrive pas à choisir entre une licence, un BUT et une école d’ingénieurs.',
    status: 'en_attente',
    declinedBy: [],
    createdAt: '2026-10-20T16:40:00.000Z',
    updatedAt: '2026-10-20T16:40:00.000Z',
  },
  {
    id: 'req-yanis',
    studentId: 'u-yanis',
    preferredCounselorId: gabriel,
    slots: ['2026-11-03T18:00:00', '2026-11-05T18:00:00'],
    format: 'chat',
    topic: 'Est-ce qu’une école d’ingénieurs est possible après un bac technologique ?',
    status: 'en_attente',
    declinedBy: [],
    createdAt: '2026-10-19T12:00:00.000Z',
    updatedAt: '2026-10-19T12:00:00.000Z',
  },
  {
    id: 'req-ines',
    studentId: 'u-ines',
    preferredCounselorId: null,
    slots: ['2026-11-02T12:00:00', '2026-11-04T17:00:00'],
    format: 'visio',
    topic: 'Je voudrais être sûre de mon choix entre santé et social.',
    status: 'en_attente',
    declinedBy: [],
    createdAt: '2026-10-18T12:00:00.000Z',
    updatedAt: '2026-10-18T12:00:00.000Z',
  },
  {
    id: 'req-noe',
    studentId: 'u-noe',
    preferredCounselorId: gabriel,
    slots: ['2026-10-12T17:00:00'],
    format: 'visio',
    topic: 'Faire le point sur les licences de droit et de langues.',
    status: 'acceptee',
    declinedBy: [],
    createdAt: '2026-10-05T12:00:00.000Z',
    updatedAt: '2026-10-06T12:00:00.000Z',
    acceptedBy: gabriel,
    acceptedSlot: '2026-10-12T17:00:00',
    appointmentId: 'apt-noe',
  },
]

export const seedAppointments: Appointment[] = [
  {
    id: 'apt-noe',
    requestId: 'req-noe',
    studentId: 'u-noe',
    counselorId: gabriel,
    startsAt: '2026-10-12T17:00:00',
    format: 'visio',
    durationMinutes: 30,
    status: 'termine',
    createdAt: '2026-10-06T12:00:00.000Z',
  },
]

export const seedCounselorNotes: CounselorNote[] = [
  { id: `${gabriel}:u-yanis`, counselorId: gabriel, studentId: 'u-yanis', body: '', followStatus: 'a_contacter', updatedAt: '2026-10-19T12:00:00.000Z' },
  { id: `${gabriel}:u-ines`, counselorId: gabriel, studentId: 'u-ines', body: '', followStatus: 'entretien_planifie', updatedAt: '2026-10-19T12:00:00.000Z' },
  {
    id: `${gabriel}:u-noe`,
    counselorId: gabriel,
    studentId: 'u-noe',
    body: 'Premier échange le 12/10 : comparer les licences de droit et LLCER.',
    followStatus: 'suivi_en_cours',
    updatedAt: '2026-10-12T18:00:00.000Z',
  },
]

const official = (id: string, date: string, title: string, subtitle: string, badge: Deadline['badge'], endDate?: string): Deadline => ({
  id,
  ownerId: null,
  date,
  endDate,
  title,
  subtitle,
  badge,
  createdAt: '2026-09-01T08:00:00.000Z',
})

export const seedDeadlines: Deadline[] = [
  official('dl-voeux-ouverture', '2027-01-20', 'Ouverture de la saisie des vœux', 'Sur la plateforme officielle', 'officiel'),
  official('dl-voeux-fin', '2027-03-13', 'Dernier jour pour formuler vos vœux', 'Plateforme officielle', 'important'),
  official(
    'dl-confirmation',
    '2027-04-01',
    'Dernier jour pour confirmer vos vœux et compléter vos dossiers',
    'Plateforme officielle',
    'important',
  ),
  official(
    'dl-reponses',
    '2027-06-02',
    'Début des réponses des formations',
    'Répondez dans le délai indiqué dans chaque proposition',
    'delai-court',
  ),
  official(
    'dl-attente',
    '2027-06-05',
    'Classer vos vœux en attente',
    'Sans action de votre part, des vœux en attente peuvent être supprimés',
    'urgent',
    '2027-06-08',
  ),
  {
    id: 'dl-lea-po-iut',
    ownerId: lea,
    date: '2027-02-06',
    title: 'Portes ouvertes · IUT de Valmont',
    subtitle: 'Ajoutée depuis vos favoris',
    badge: 'favori',
    formationId: 'f-but-info',
    createdAt: '2026-10-18T17:35:00.000Z',
  },
  {
    id: 'dl-lea-po-aurelis',
    ownerId: lea,
    date: '2027-02-13',
    title: 'Portes ouvertes · École Aurelis',
    subtitle: 'Ajoutée depuis la page de l’école',
    badge: 'favori',
    institutionEventId: 'evt-aurelis-po',
    createdAt: '2026-10-19T18:00:00.000Z',
  },
]

export const seedReminders: ReminderSettings[] = [
  { userId: lea, sevenDays: true, dayBefore: true, phone: true, email: false, simulatedToday: null, updatedAt: '2026-10-20T08:00:00.000Z' },
]

export const seedActivity: ActivityEntry[] = [
  {
    id: 'act-lea-inscription',
    userId: lea,
    actorId: lea,
    actorName: 'Léa D.',
    type: 'inscription',
    description: 'Création du compte lycéen.',
    at: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'act-lea-partage',
    userId: lea,
    actorId: lea,
    actorName: 'Léa D.',
    type: 'partage_accorde',
    description: 'Partage du dossier avec un conseiller accordé.',
    at: '2026-10-20T16:30:00.000Z',
  },
  {
    id: 'act-lea-visibilite',
    userId: lea,
    actorId: lea,
    actorName: 'Léa D.',
    type: 'visibilite_accordee',
    description: 'Profil simplifié rendu visible par les écoles de votre liste.',
    at: '2026-10-20T16:31:00.000Z',
  },
  {
    id: 'act-lea-rdv',
    userId: lea,
    actorId: lea,
    actorName: 'Léa D.',
    type: 'rdv_demande',
    description: 'Demande de rendez-vous envoyée à Gabriel B. (3 créneaux, visio).',
    at: '2026-10-20T16:40:00.000Z',
  },
  {
    id: 'act-gabriel-inscription',
    userId: gabriel,
    actorId: gabriel,
    actorName: 'Gabriel B.',
    type: 'inscription',
    description: 'Création du compte conseiller.',
    at: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'act-alain-inscription',
    userId: DEMO_IDS.alain,
    actorId: DEMO_IDS.alain,
    actorName: 'Alain Aubert',
    type: 'inscription',
    description: 'Création du compte établissement, rattaché à l’École d’ingénieurs d’Aurelis.',
    at: '2026-09-01T08:00:00.000Z',
  },
]
