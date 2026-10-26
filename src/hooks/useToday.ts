import { useAuth } from '../auth/AuthContext'
import { deadlineRepo } from '../db/repositories'
import { fromIsoDay, toIsoDay } from '../lib/dates'
import { useRepo } from './useRepo'

/**
 * Date du jour utilisée par l'application : la date réelle, ou la date simulée
 * choisie par le lycéen dans « Échéances » (réglage de démonstration).
 */
export const useToday = () => {
  const { user } = useAuth()
  const isStudent = user?.role === 'lyceen'
  const { data } = useRepo(async () => (isStudent ? (await deadlineRepo.getReminders(user.id)).simulatedToday : null), [user?.id, isStudent])
  return data ? fromIsoDay(data) : fromIsoDay(toIsoDay(new Date()))
}
