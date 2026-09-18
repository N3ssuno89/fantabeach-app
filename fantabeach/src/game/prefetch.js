// Precaricamento delle foto: mentre l'utente guarda una card si scaricano quelle
// che vedrà subito dopo, così non compaiono in ritardo.
//
// Nessun crossOrigin: qui serve la cache del browser per i tag <img> della card,
// che non lo usano. Le storie hanno un loro caricamento (story.js) perché il
// canvas pretende crossOrigin, e una richiesta con CORS non condivide la voce di
// cache con una senza.
import { photoUrl } from './supabase.js'

const chiesti = new Set()
const vive = [] // si tengono referenziate: un'Image non referenziata può essere scartata

export function prefetchPhotos(atleti) {
  for (const a of atleti) {
    const path = a && a.photo_path
    if (!path || chiesti.has(path)) continue
    chiesti.add(path)
    const im = new Image()
    im.decoding = 'async'
    im.src = photoUrl(path)
    vive.push(im)
    if (vive.length > 60) vive.shift()
  }
}

export const giaChieste = () => chiesti.size
