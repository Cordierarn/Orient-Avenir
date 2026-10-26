import { domainLabel, domains, levelLabels } from '../data/domains'
import type { DomainId, FormationView, Level } from '../types'

/** Aides à la préparation d'entretien, calculées uniquement à partir des données partagées. */

interface DossierInput {
  firstName: string
  interests: Partial<Record<DomainId, Level>>
  specialites: string[]
  favorites: FormationView[]
  compared: FormationView[]
  alternance: boolean
}

const typeGroup = (f: FormationView) =>
  ({ BUT: 'BUT', BTS: 'BTS', Licence: 'licence', 'École d’ingénieurs': 'école d’ingénieurs', Bachelor: 'bachelor', CPGE: 'prépa', 'Formation en soins infirmiers': 'formation en soins infirmiers' })[
    f.typeShort
  ]

export const talkingPoints = ({ firstName, interests, favorites, compared }: DossierInput) => {
  const points: string[] = []
  const all = [...favorites, ...compared.filter((c) => !favorites.some((f) => f.id === c.id))]
  const groups = [...new Set(all.map(typeGroup))]
  if (groups.length >= 2) {
    points.push(`${firstName} hésite entre ${groups.slice(0, -1).join(', ')} et ${groups.at(-1)} : clarifier ses attentes vis-à-vis d’une formation (pratique, durée, coût).`)
  }
  const mathFavorite = favorites.find((f) => /math/i.test(f.vigilance))
  if (mathFavorite) points.push(`${mathFavorite.title} demande un bon niveau en maths : recueillir son ressenti.`)
  for (const f of compared.filter((c) => !favorites.some((fav) => fav.id === c.id)).slice(0, 1)) {
    points.push(`${f.title} est comparée mais pas en favoris : ${f.cost.toLowerCase().startsWith('frais de scolarité') ? 'coût et éloignement' : 'ce qui la retient'} à aborder.`)
  }
  const pistesDomains = new Set(all.flatMap((f) => f.tags))
  const low = domains.find((d) => interests[d.id] === 2 && !pistesDomains.has(d.id))
  if (low) points.push(`Intérêt « ${levelLabels[2]} » pour ${domainLabel(low.id).toLowerCase()}, sans aucune piste : à explorer ou à écarter ensemble.`)
  if (!points.length) points.push(`Faire le point avec ${firstName} sur ce qui compte le plus dans sa future formation.`)
  return points
}

export const interviewQuestions = ({ interests, favorites, specialites, alternance }: DossierInput) => {
  const questions: string[] = []
  if (favorites.some((f) => /équipe/i.test(f.learningLabel + f.summary))) questions.push('Qu’est-ce qui te plaît le plus dans les projets en équipe ?')
  else {
    const top = domains.filter((d) => interests[d.id] !== undefined).sort((a, b) => (interests[b.id] ?? 0) - (interests[a.id] ?? 0))[0]
    if (top) questions.push(`Qu’est-ce qui te plaît le plus dans le domaine « ${top.label} » ?`)
  }
  if (specialites.includes('Mathématiques')) questions.push('Comment te sens-tu en mathématiques cette année ?')
  else if (specialites[0]) questions.push(`Comment se passe ton année en ${specialites[0]} ?`)
  questions.push(
    alternance
      ? 'Qu’est-ce qui compte le plus pour toi : rester près de chez toi, la durée ou l’alternance ?'
      : 'Qu’est-ce qui compte le plus pour toi : rester près de chez toi, la durée ou le type d’enseignement ?',
  )
  return questions
}
