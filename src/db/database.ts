import Dexie, { type Table } from 'dexie'
import type {
  ActivityEntry,
  Appointment,
  AppointmentRequest,
  Comparison,
  CounselorNote,
  CounselorProfile,
  Deadline,
  Favorite,
  Formation,
  Institution,
  Message,
  MetaEntry,
  ReminderSettings,
  Session,
  Share,
  StudentProfile,
  User,
} from '../types'

/**
 * Base IndexedDB locale. Seuls les modules de `src/db/repositories` y accèdent.
 * Chaque nouvelle version du schéma s'ajoute ici sans supprimer les données existantes.
 */
export class OrientAvenirDB extends Dexie {
  users!: Table<User, string>
  studentProfiles!: Table<StudentProfile, string>
  counselorProfiles!: Table<CounselorProfile, string>
  institutions!: Table<Institution, string>
  formations!: Table<Formation, string>
  favorites!: Table<Favorite, string>
  comparisons!: Table<Comparison, string>
  shares!: Table<Share, string>
  appointmentRequests!: Table<AppointmentRequest, string>
  appointments!: Table<Appointment, string>
  messages!: Table<Message, string>
  counselorNotes!: Table<CounselorNote, string>
  deadlines!: Table<Deadline, string>
  reminders!: Table<ReminderSettings, string>
  sessions!: Table<Session, string>
  activityLog!: Table<ActivityEntry, string>
  meta!: Table<MetaEntry, string>

  constructor(name = 'orient-avenir') {
    super(name)
    this.version(1).stores({
      users: 'id, &email, role, isDemo, institutionId',
      studentProfiles: 'userId',
      counselorProfiles: 'userId',
      institutions: 'id',
      formations: 'id, institutionId, status',
      favorites: 'id, userId, formationId, &[userId+formationId]',
      comparisons: 'userId',
      shares: 'id, studentId, audience, &[studentId+audience]',
      appointmentRequests: 'id, studentId, preferredCounselorId, status',
      appointments: 'id, requestId, studentId, counselorId',
      messages: 'id, conversationId, sentAt, [conversationId+sentAt]',
      counselorNotes: 'id, counselorId, studentId, &[counselorId+studentId]',
      deadlines: 'id, ownerId, date',
      reminders: 'userId',
      sessions: 'id, userId',
      activityLog: 'id, userId, at, [userId+at]',
      meta: 'key',
    })
  }
}

export const db = new OrientAvenirDB()
