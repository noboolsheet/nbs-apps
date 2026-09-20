"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, Check, AlertCircle } from 'lucide-react'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/*
  The contact form posts to the standalone Node backend (unilp-be) through
  the same-origin /api path proxied by Caddy. The backend re-validates the input
  and relays the message by email (Gmail SMTP).
  What is real here: schema-validated input, translated inline error messages,
  loading state during submission, double-submit protection, accessible error
  associations via aria-invalid + aria-describedby, a hidden honeypot field, and
  a submission-error state.
*/

type FormErrors = {
  name: string
  email: string
  message: string
  privacyConsent: string
}

const buildSchema = (errors: FormErrors) =>
  z.object({
    // Espejo de unilp-be/src/lib/validation.js. El regex bloquea saltos de
    // linea (\r\n) porque `name` se interpola en cabeceras del email en el backend.
    name: z.string().trim().regex(/^[^\r\n]+$/, { message: errors.name }).min(2, { message: errors.name }).max(120),
    email: z.string().trim().email({ message: errors.email }),
    message: z.string().trim().min(10, { message: errors.message }).max(2000),
    privacyConsent: z.boolean().refine((value) => value === true, {
      message: errors.privacyConsent,
    }),
    // Honeypot: invisible to humans, bots tend to fill it. Stays empty normally.
    website: z.string().optional(),
  })

type FormValues = z.infer<ReturnType<typeof buildSchema>>

function ContattiContent() {
  const { t } = useTranslation()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const schema = buildSchema(t.contatti.form.errors)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', message: '', privacyConsent: false, website: '' },
    mode: 'onBlur',
  })

  const consentChecked = watch('privacyConsent')

  const onSubmit = async (_data: FormValues) => {
    // DEMO: this is a static portfolio build with no backend deployed. The form
    // stays fully validated (react-hook-form + zod already gate this handler), but
    // instead of POSTing to /api/contact we simulate a successful submission
    // entirely client-side so the existing success UI is shown.
    setSubmitError(false)
    await new Promise((resolve) => setTimeout(resolve, 600))
    reset()
    setIsSubmitted(true)
  }

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <section
        aria-labelledby="contatti-headline"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="label uppercase text-warm-brick-on-navy">{t.contatti.kicker}</p>
          <h1
            id="contatti-headline"
            className="display mt-4 max-w-[18ch] text-paper-cream"
          >
            {t.contatti.title}
          </h1>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.contatti.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-paper-cream py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px] lg:gap-16">
            <div>
              <p className="lede max-w-prose text-ink-black">
                {t.contatti.description}
              </p>

              {isSubmitted ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-10 border border-ink-line bg-paper-cream-deep p-8"
                >
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-warm-brick-text" aria-hidden />
                    <p className="label uppercase text-warm-brick-text">
                      {t.contatti.form.success}
                    </p>
                  </div>
                  <div className="mt-6">
                    <Button
                      onClick={() => setIsSubmitted(false)}
                      variant="outline"
                      className="border border-ink-navy bg-transparent uppercase tracking-wider text-ink-navy shadow-none transition-colors duration-200 ease-out hover:bg-ink-navy hover:text-paper-cream"
                    >
                      {t.contatti.form.sendAnother}
                    </Button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="mt-10 space-y-6"
                >
                  {/* Honeypot: hidden from humans (and screen readers), bots fill it. */}
                  <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
                    <label htmlFor="website">Website</label>
                    <input
                      type="text"
                      id="website"
                      tabIndex={-1}
                      autoComplete="off"
                      {...register('website')}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="name"
                      className="label uppercase block text-ink-black"
                    >
                      {t.contatti.form.name}
                    </label>
                    <Input
                      type="text"
                      id="name"
                      autoComplete="name"
                      placeholder={t.contatti.form.namePlaceholder}
                      aria-invalid={errors.name ? 'true' : 'false'}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      className="mt-2 w-full"
                      {...register('name')}
                    />
                    {errors.name && (
                      <p
                        id="name-error"
                        role="alert"
                        className="mt-2 inline-flex items-center gap-2 text-sm text-warm-brick-text"
                      >
                        <AlertCircle className="h-4 w-4" aria-hidden />
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="label uppercase block text-ink-black"
                    >
                      {t.contatti.form.email}
                    </label>
                    <Input
                      type="email"
                      id="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder={t.contatti.form.emailPlaceholder}
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className="mt-2 w-full"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p
                        id="email-error"
                        role="alert"
                        className="mt-2 inline-flex items-center gap-2 text-sm text-warm-brick-text"
                      >
                        <AlertCircle className="h-4 w-4" aria-hidden />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="label uppercase block text-ink-black"
                    >
                      {t.contatti.form.message}
                    </label>
                    <textarea
                      id="message"
                      rows={6}
                      placeholder={t.contatti.form.messagePlaceholder}
                      aria-invalid={errors.message ? 'true' : 'false'}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                      className="mt-2 w-full resize-none border border-ink-line bg-paper-cream px-4 py-3 text-ink-black placeholder:text-ink-quiet focus-visible:border-ink-navy focus-visible:outline-none"
                      style={{ boxShadow: 'none' }}
                      {...register('message')}
                    />
                    {errors.message && (
                      <p
                        id="message-error"
                        role="alert"
                        className="mt-2 inline-flex items-center gap-2 text-sm text-warm-brick-text"
                      >
                        <AlertCircle className="h-4 w-4" aria-hidden />
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="privacyConsent"
                        aria-invalid={errors.privacyConsent ? 'true' : 'false'}
                        aria-describedby={errors.privacyConsent ? 'privacyConsent-error' : undefined}
                        className="mt-1 h-4 w-4 shrink-0 accent-ink-navy"
                        {...register('privacyConsent')}
                      />
                      <label
                        htmlFor="privacyConsent"
                        className="text-sm leading-relaxed text-ink-black"
                      >
                        {t.contatti.form.privacyConsentPrefix}
                        <Link
                          href="/privacy"
                          className="text-ink-navy underline underline-offset-2 transition-colors duration-200 ease-out hover:text-warm-brick"
                        >
                          {t.contatti.form.privacyConsentLink}
                        </Link>
                        {t.contatti.form.privacyConsentSuffix}
                      </label>
                    </div>
                    {errors.privacyConsent && (
                      <p
                        id="privacyConsent-error"
                        role="alert"
                        className="mt-2 inline-flex items-center gap-2 text-sm text-warm-brick-text"
                      >
                        <AlertCircle className="h-4 w-4" aria-hidden />
                        {errors.privacyConsent.message}
                      </p>
                    )}
                  </div>

                  {submitError && (
                    <p
                      role="alert"
                      className="inline-flex items-center gap-2 text-sm text-warm-brick-text"
                    >
                      <AlertCircle className="h-4 w-4" aria-hidden />
                      {t.contatti.form.error}
                    </p>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting || !consentChecked}
                      className="bg-ink-navy uppercase tracking-wider text-paper-cream transition-colors duration-200 ease-out hover:bg-ink-navy-deep disabled:opacity-70"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? t.contatti.form.submitting : t.contatti.form.submit}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <aside className="border-t border-ink-line pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
              <p className="label uppercase text-warm-brick-text">
                {t.contatti.info.title}
              </p>

              <dl className="mt-8 space-y-8">
                <div>
                  <dt className="label uppercase text-ink-quiet">
                    {t.contatti.info.emailLabel}
                  </dt>
                  <dd className="mt-2">
                    <a
                      href="mailto:demo@example.com"
                      className="text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
                    >
                      {t.contatti.info.email}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="label uppercase text-ink-quiet">
                    {t.contatti.info.phoneLabel}
                  </dt>
                  <dd className="mt-2">
                    <a
                      href="tel:+390000000000"
                      className="text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
                    >
                      {t.contatti.info.phone}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="label uppercase text-ink-quiet">
                    {t.contatti.info.whatsappLabel}
                  </dt>
                  <dd className="mt-2">
                    <a
                      href="https://wa.me/390000000000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
                    >
                      {t.contatti.info.whatsapp}
                    </a>
                  </dd>
                </div>

                <div>
                  <dt className="label uppercase text-ink-quiet">
                    {t.contatti.info.websiteLabel}
                  </dt>
                  <dd className="mt-2">
                    <a
                      href="https://unilp.noboolsheet.local"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
                    >
                      {t.contatti.info.website}
                    </a>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function ContattiPage() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <ContattiContent />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
