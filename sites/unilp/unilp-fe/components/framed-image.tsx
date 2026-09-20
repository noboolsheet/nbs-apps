import Image from 'next/image'

/*
  Framed editorial image. Sits on cream sections beside body copy, so the navy
  treatment is light (a ~12% multiply tint plus mild desaturation), not the
  heavy plinth tint used in the hero, which would read as a dark block on cream.
  Flat by design (Flat-Plinth Rule): a 1px Ink Line frame and a 4px radius, no
  shadow. objectPosition crops toward the subjects and away from the
  bottom-right stock watermark. Aspect ratio comes from the caller's className.
*/
export function FramedImage({
  src,
  alt,
  className,
  objectPosition = 'center 32%',
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  objectPosition?: string
  priority?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[4px] border border-ink-line ${className ?? ''}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover [filter:saturate(0.85)_contrast(1.02)]"
        style={{ objectPosition }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-ink-navy opacity-[0.12] mix-blend-multiply"
      />
    </div>
  )
}
