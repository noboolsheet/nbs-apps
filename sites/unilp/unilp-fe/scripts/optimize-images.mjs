// Genera versiones WebP optimizadas de las fotos del sitio.
//
// Por qué: las fotos se subieron como PNG de 1-2 MB (~1024 px), un formato muy
// ineficiente para imágenes fotográficas. El sitio usa `output: 'export'`, así
// que `images.unoptimized` está activo y Next no las optimiza. Este script las
// reconvierte a WebP (≈95% menos peso) antes del build.
//
// - Lee los originales de `image-sources/` (fuera de public/, para que esos
//   PNG pesados NO se copien al export ni al contenedor) y escribe los `.webp`
//   en `public/images/`, que es lo que las páginas referencian.
// - Idempotente: omite si el .webp ya existe y es más nuevo que el origen.
// - Se ejecuta en cada build (script `prebuild`), así que cualquier imagen
//   nueva que agregues a `image-sources/` se optimiza automáticamente.
// - Para reemplazar una foto: deja el nuevo PNG/JPG en `image-sources/` con el
//   mismo nombre y vuelve a buildear (o `npm run optimize-images`).

import { readdir, stat } from 'node:fs/promises'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SOURCE_DIR = fileURLToPath(new URL('../image-sources', import.meta.url))
const OUTPUT_DIR = fileURLToPath(new URL('../public/images', import.meta.url))
const MAX_WIDTH = 1200
const QUALITY = 80
const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg'])

function isSource(name) {
  return SOURCE_EXT.has(parse(name).ext.toLowerCase())
}

async function newerThan(a, b) {
  // true si `a` existe y su mtime es >= mtime de `b` (b ya existe seguro).
  try {
    const [sa, sb] = await Promise.all([stat(a), stat(b)])
    return sa.mtimeMs >= sb.mtimeMs
  } catch {
    return false // a no existe
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`
}

async function main() {
  let entries
  try {
    entries = await readdir(SOURCE_DIR)
  } catch {
    console.log('[optimize-images] no existe image-sources/, nada que procesar.')
    return
  }
  const sources = entries.filter(isSource)

  if (sources.length === 0) {
    console.log('[optimize-images] no hay imágenes para procesar.')
    return
  }

  let converted = 0
  let skipped = 0

  for (const name of sources) {
    const src = join(SOURCE_DIR, name)
    const dest = join(OUTPUT_DIR, `${parse(name).name}.webp`)

    if (await newerThan(dest, src)) {
      skipped++
      continue
    }

    const srcStat = await stat(src)
    await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(dest)
    const destStat = await stat(dest)
    converted++

    const saved = (1 - destStat.size / srcStat.size) * 100
    console.log(
      `[optimize-images] ${name}: ${kb(srcStat.size)} → ${parse(dest).base} ${kb(
        destStat.size
      )} (-${saved.toFixed(0)}%)`
    )
  }

  console.log(
    `[optimize-images] listo. ${converted} convertida(s), ${skipped} sin cambios.`
  )
}

main().catch((err) => {
  console.error('[optimize-images] error:', err)
  process.exit(1)
})
