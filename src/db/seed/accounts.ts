import type { CounselorProfile, PasswordCredential, StudentProfile, User } from '../../types'

/**
 * Comptes de démonstration. Le mot de passe (documenté dans le README) n'apparaît jamais ici :
 * seules ses empreintes PBKDF2, générées par `scripts/hash-password.mjs`, sont versionnées.
 */
const credential = (salt: string, hash: string): PasswordCredential => ({
  algorithm: 'PBKDF2-SHA-256',
  iterations: 600_000,
  salt,
  hash,
})

export const DEMO_IDS = {
  lea: 'u-lea',
  gabriel: 'u-gabriel',
  alain: 'u-alain',
} as const

const created = '2026-09-01T08:00:00.000Z'

const persona = (id: string, firstName: string, lastName: string, email: string, role: User['role']): User => ({
  id,
  email,
  firstName,
  lastName,
  role,
  credential: null,
  isDemo: false,
  isGuest: false,
  onboarded: true,
  createdAt: created,
})

export const seedUsers: User[] = [
  {
    id: DEMO_IDS.lea,
    email: 'lea.d@exemple.fr',
    firstName: 'Léa',
    lastName: 'Dumont',
    role: 'lyceen',
    credential: credential('3kYTdI83fHFk4ijFJdODgQ==', '09+1W/lMqMEm0r8K6sG7OAoZL2f7nCf2b3i2swhVHeQ='),
    isDemo: true,
    isGuest: false,
    onboarded: true,
    createdAt: created,
  },
  {
    id: DEMO_IDS.gabriel,
    email: 'gabriel.b@exemple.fr',
    firstName: 'Gabriel',
    lastName: 'Bernard',
    role: 'conseiller',
    credential: credential('PrOfJ7zgOTStLfVUzuzYvg==', 'OtWjLygu/VLLWxcN9BDZ14aZOKGSA/LHhYqfcDrCvLc='),
    isDemo: true,
    isGuest: false,
    onboarded: true,
    createdAt: created,
  },
  {
    id: DEMO_IDS.alain,
    email: 'a.aubert@aurelis.exemple',
    firstName: 'Alain',
    lastName: 'Aubert',
    role: 'etablissement',
    credential: credential('qsm/ZLaz01g/nn1BW/Hl0g==', 'e7QwMIpOuKj+A0AqonNHEXGaS4XmddVVOKK+/LcjfWA='),
    isDemo: true,
    isGuest: false,
    institutionId: 'inst-aurelis-ingenieurs',
    onboarded: true,
    createdAt: created,
  },
  // Personnes fictives sans identifiants : elles ne peuvent pas se connecter.
  persona('u-sophie', 'Sophie', 'Laurent', 'sophie.l@exemple.fr', 'conseiller'),
  persona('u-yanis', 'Yanis', 'Benali', 'yanis.b@exemple.fr', 'lyceen'),
  persona('u-ines', 'Inès', 'Tavares', 'ines.t@exemple.fr', 'lyceen'),
  persona('u-noe', 'Noé', 'Renaud', 'noe.r@exemple.fr', 'lyceen'),
  persona('u-jeanne', 'Jeanne', 'Morel', 'jeanne.m@exemple.fr', 'lyceen'),
  ...Array.from({ length: 7 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    const names = ['Camille', 'Lucas', 'Manon', 'Adam', 'Chloé', 'Rayan', 'Zoé']
    return persona(`u-eleve-${n}`, names[i], 'Fictif', `eleve${n}@exemple.fr`, 'lyceen')
  }),
]

const updated = '2026-10-20T08:00:00.000Z'

const student = (userId: string, data: Partial<StudentProfile>): StudentProfile => ({
  userId,
  classe: 'Terminale générale',
  interests: {},
  specialites: [],
  alternance: false,
  grades: {},
  useGrades: false,
  completedSteps: [1, 2],
  updatedAt: updated,
  ...data,
})

export const seedStudentProfiles: StudentProfile[] = [
  student(DEMO_IDS.lea, {
    interests: {
      numerique: 5,
      sciences: 3,
      concevoir: 4,
      sante: 2,
      social: 2,
      gestion: 2,
      creation: 3,
      langues: 2,
      environnement: 3,
    },
    specialites: ['Mathématiques', 'NSI'],
    city: 'moyenne',
    duration: '3',
    learning: 'pratique',
    alternance: true,
    grades: { Mathématiques: 14.5, NSI: 16, Français: 12, 'Moyenne générale': 13.8 },
    useGrades: true,
    completedSteps: [1, 2, 3],
    publicSummary:
      'Aime coder et travailler en équipe. Hésite entre une formation pratique et une formation plus théorique.',
    questions: 'Coût de la scolarité, place des projets',
  }),
  student('u-yanis', {
    classe: 'Terminale STI2D',
    interests: { concevoir: 5, environnement: 4, numerique: 3, sciences: 3, sante: 1, social: 2, gestion: 1, creation: 2, langues: 1 },
    specialites: ['Ingénierie, innovation et développement durable'],
    city: 'indifferent',
    duration: '5+',
    learning: 'pratique',
    alternance: true,
    grades: { 'Moyenne générale': 12.4 },
    useGrades: true,
    publicSummary: 'Aime construire et comprendre comment les choses marchent. Cherche une école avec beaucoup de projets.',
    questions: 'Admission après un bac technologique',
  }),
  student('u-ines', {
    interests: { sante: 5, social: 4, sciences: 3, langues: 2, numerique: 1, concevoir: 1, gestion: 2, creation: 2, environnement: 3 },
    specialites: ['SVT', 'SES'],
    city: 'moyenne',
    duration: '3',
    learning: 'equilibree',
    alternance: false,
    grades: { 'Moyenne générale': 14.1 },
    useGrades: true,
  }),
  student('u-noe', {
    interests: { social: 4, langues: 4, gestion: 3, creation: 3, numerique: 2, sciences: 1, concevoir: 1, sante: 2, environnement: 3 },
    specialites: ['HGGSP', 'SES'],
    city: 'grande',
    duration: '5+',
    learning: 'theorique',
    alternance: false,
  }),
  student('u-jeanne', {
    classe: 'Première générale',
    interests: { sciences: 5, concevoir: 4, numerique: 3, environnement: 3, sante: 2, social: 1, gestion: 1, creation: 2, langues: 2 },
    specialites: ['Mathématiques', 'Physique-chimie', 'SVT'],
    city: 'indifferent',
    duration: '5+',
    learning: 'equilibree',
    alternance: false,
    publicSummary: 'Passionnée de physique. Se demande si une prépa intégrée est moins stressante qu’une prépa classique.',
    questions: 'Rythme de travail, accompagnement',
  }),
  ...Array.from({ length: 7 }, (_, i) =>
    student(`u-eleve-${String(i + 1).padStart(2, '0')}`, {
      interests: { concevoir: 4, sciences: 4, numerique: 3 },
      specialites: ['Mathématiques', 'Physique-chimie'],
      learning: 'equilibree',
      publicSummary: 'Intéressé·e par les sciences de l’ingénieur et les projets concrets.',
      questions: 'Déroulé des études, stages',
    }),
  ),
]

export const seedCounselorProfiles: CounselorProfile[] = [
  {
    userId: DEMO_IDS.gabriel,
    title: 'Conseiller d’orientation indépendant, ancien étudiant en informatique',
    domains: ['numerique', 'sciences', 'concevoir'],
    tags: ['Numérique', 'Écoles d’ingénieurs'],
    availability: 'Disponible en soirée · visio ou chat',
    formats: ['visio', 'chat'],
    updatedAt: updated,
  },
  {
    userId: 'u-sophie',
    title: 'Conseillère d’orientation, spécialiste des licences universitaires',
    domains: ['sciences', 'social', 'langues', 'sante'],
    tags: ['Université', 'Sciences'],
    availability: 'Disponible le midi · visio',
    formats: ['visio'],
    updatedAt: updated,
  },
]
