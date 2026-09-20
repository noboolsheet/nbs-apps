// Genera versiones optimizadas de las imágenes del sitio.
//
// Por qué: las imágenes se subieron como PNG/JPG pesados (cientos de KB – varios MB),
// muy ineficientes para la web. Este script las reconvierte antes de servirlas.
//
// - Lee los originales de `images-sources/` (fuera de public/, para que esos
//   archivos pesados NO se sirvan en producción) y escribe las versiones
//   optimizadas en `public/images/`, que es lo que las páginas referencian.
// - Fotos  -> WebP (resize máx. 1200px, calidad 80).
// - Logos  -> PNG (resize máx. 512px, recomprimido): se mantiene PNG para conservar
//             nitidez y transparencia.
// - Idempotente: omite si la salida ya existe y es más nueva que el origen.
//
// NO se engancha al build (el contenedor usa bun/alpine, donde sharp es frágil).
// Se corre a mano con `npm run optimize-images` y las salidas se commitean.

import { mkdir, readdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SOURCE_DIR = fileURLToPath(new URL("../images-sources", import.meta.url));
const OUTPUT_DIR = fileURLToPath(new URL("../public/images", import.meta.url));
const SOURCE_EXT = new Set([".png", ".jpg", ".jpeg"]);

// Las fotos se sirven como WebP; los logos se mantienen PNG (nitidez/alpha).
// El logo se muestra a <=56px de alto (~75px de ancho); 320px de ancho da margen
// de sobra para retina/2-3x manteniéndolo nítido y ligero.
const PHOTO = { width: 1200, quality: 80 };
const LOGO = { width: 320 };

// Overrides de calidad por imagen (clave = nombre sin extensión). Las fotos muy
// detalladas pesan más a q80; al ir bajo un overlay oscuro, bajar la calidad no
// se nota y ahorra bastante.
const QUALITY_OVERRIDES = { "hero-2": 70 };

// Favicons: un mismo origen `favicon-*` genera varios tamaños cuadrados (PNG).
// El de la pestaña va transparente (se adapta a temas claro/oscuro); el
// apple-touch-icon va opaco sobre blanco (iOS no admite transparencia).
const FAVICON_SIZES = [
  { suffix: "32", size: 32, opaque: false },
  { suffix: "180", size: 180, opaque: true },
];

function isSource(name) {
  return SOURCE_EXT.has(parse(name).ext.toLowerCase());
}

function isLogo(name) {
  return parse(name).name.toLowerCase().startsWith("logo");
}

function isFavicon(name) {
  return parse(name).name.toLowerCase().startsWith("favicon");
}

async function newerThan(a, b) {
  // true si `a` existe y su mtime es >= mtime de `b` (b ya existe seguro).
  try {
    const [sa, sb] = await Promise.all([stat(a), stat(b)]);
    return sa.mtimeMs >= sb.mtimeMs;
  } catch {
    return false; // a no existe
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function main() {
  let entries;
  try {
    entries = await readdir(SOURCE_DIR);
  } catch {
    console.log("[optimize-images] no existe images-sources/, nada que procesar.");
    return;
  }
  const sources = entries.filter(isSource);

  if (sources.length === 0) {
    console.log("[optimize-images] no hay imágenes para procesar.");
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  let converted = 0;
  let skipped = 0;

  for (const name of sources) {
    const src = join(SOURCE_DIR, name);
    const stem = parse(name).name;

    // Favicons: un origen genera varios PNG cuadrados (32 transparente para la
    // pestaña, 180 opaco para apple-touch-icon).
    if (isFavicon(name)) {
      for (const v of FAVICON_SIZES) {
        const dest = join(OUTPUT_DIR, `${stem}-${v.suffix}.png`);
        if (await newerThan(dest, src)) {
          skipped++;
          continue;
        }
        let img = sharp(src).resize(v.size, v.size, {
          fit: "contain",
          background: v.opaque ? "#ffffff" : { r: 255, g: 255, b: 255, alpha: 0 },
        });
        if (v.opaque) img = img.flatten({ background: "#ffffff" });
        await img.png({ compressionLevel: 9 }).toFile(dest);
        const destStat = await stat(dest);
        converted++;
        console.log(
          `[optimize-images] ${name} → ${parse(dest).base} ${kb(destStat.size)} (${v.size}px, ${v.opaque ? "opaco" : "alpha"})`,
        );
      }
      continue;
    }

    const logo = isLogo(name);
    const dest = join(OUTPUT_DIR, `${stem}.${logo ? "png" : "webp"}`);

    if (await newerThan(dest, src)) {
      skipped++;
      continue;
    }

    const srcStat = await stat(src);
    const pipeline = sharp(src);

    if (logo) {
      await pipeline
        .resize({ width: LOGO.width, withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toFile(dest);
    } else {
      await pipeline
        .resize({ width: PHOTO.width, withoutEnlargement: true })
        .webp({ quality: QUALITY_OVERRIDES[stem] ?? PHOTO.quality })
        .toFile(dest);
    }

    const destStat = await stat(dest);
    converted++;

    const saved = (1 - destStat.size / srcStat.size) * 100;
    console.log(
      `[optimize-images] ${name}: ${kb(srcStat.size)} → ${parse(dest).base} ${kb(
        destStat.size,
      )} (-${saved.toFixed(0)}%)`,
    );
  }

  console.log(`[optimize-images] listo. ${converted} convertida(s), ${skipped} sin cambios.`);
}

main().catch((err) => {
  console.error("[optimize-images] error:", err);
  process.exit(1);
});
