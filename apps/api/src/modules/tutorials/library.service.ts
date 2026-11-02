import type { TutorialCatalog, TutorialCatalogDeps } from './catalog.service'
import { createTutorialCatalog } from './catalog.service'
import type { TutorialViewer, TutorialViewerDeps } from './viewer.service'
import { createTutorialViewer } from './viewer.service'

export type { TutorialCounts } from './catalog.service'
export type { TutorialRef } from './viewer.service'

export type TutorialLibraryDeps = TutorialCatalogDeps & TutorialViewerDeps

export type TutorialLibrary = TutorialCatalog & TutorialViewer

export function createTutorialLibrary(deps: TutorialLibraryDeps): TutorialLibrary {
  return { ...createTutorialCatalog(deps), ...createTutorialViewer(deps) }
}
