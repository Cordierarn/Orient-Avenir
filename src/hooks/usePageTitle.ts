import { useEffect } from 'react'

/** Titre de l'onglet du navigateur, annoncé par les lecteurs d'écran au changement de page. */
export const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = `${title} · Orient’Avenir`
  }, [title])
}
