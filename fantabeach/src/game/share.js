// Condivisione: immagine nella storia e link negli appunti con un solo tocco.
// Le due cose partono entrambe dentro il gesto dell'utente: se si attendesse la
// prima, i browser mobili considererebbero scaduta l'interazione e rifiuterebbero
// la seconda.

// Link al gioco sul sito in cui ci si trova (su staging punta a staging)
export function gameLink() {
  try {
    return `${window.location.origin}/game`
  } catch (_) {
    return '/game'
  }
}

export const canShareFiles = file => {
  try {
    return Boolean(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }))
  } catch (_) {
    return false
  }
}

export function toFile(blob, filename) {
  try {
    return new File([blob], filename, { type: 'image/png' })
  } catch (_) {
    return null
  }
}

export const canvasToBlob = canvas =>
  new Promise(res => {
    try {
      canvas.toBlob(b => res(b), 'image/png')
    } catch (_) {
      res(null)
    }
  })

export async function copyLink() {
  const link = gameLink()
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link)
      return true
    }
  } catch (_) {}
  return false
}

// Ritorna com'è andata: shared, saved, cancelled, unsupported; e se il link è negli appunti.
export async function shareStory(blob, filename) {
  const file = blob ? toFile(blob, filename) : null

  // Prima gli appunti, senza attendere: così il gesto è ancora valido per la condivisione
  let copying = null
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      copying = navigator.clipboard.writeText(gameLink())
      // Un rifiuto qui non deve diventare un errore non gestito
      copying.catch(() => {})
    }
  } catch (_) {
    copying = null
  }

  let outcome = 'unsupported'
  if (file && canShareFiles(file)) {
    try {
      await navigator.share({ files: [file] })
      outcome = 'shared'
    } catch (err) {
      outcome = err && err.name === 'AbortError' ? 'cancelled' : 'unsupported'
    }
  }

  let copied = false
  if (copying) {
    try {
      await copying
      copied = true
    } catch (_) {
      copied = false
    }
  }
  return { outcome, copied }
}

// Ripiego quando la condivisione di file non c'è: si scarica il file
export function download(blob, filename) {
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return true
  } catch (_) {
    return false
  }
}

export const slug = s =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
