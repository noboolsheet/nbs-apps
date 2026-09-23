import { AppError } from '@ct/shared';
import type { PreferredContactChannel } from './enums';

/**
 * Supresión de comunicaciones (handoff §10).
 *
 * `Do Not Contact` es una **supresión dura**: antes de cualquier acción de email, teléfono,
 * WhatsApp, LinkedIn o campaña hay que comprobar que sea falso. Anula al canal preferido — el canal
 * sólo orienta la elección cuando se puede contactar.
 *
 * Hoy Control Tower no tiene ninguna acción de outreach (el canal de notificación, HAB-1, sigue sin
 * implementar por decisión del owner), así que este guard existe para que la primera automatización
 * que se escriba lo tenga ya disponible y no lo reinvente a medias.
 */

export interface ContactabilityInput {
  doNotContact: boolean;
  /** Fecha en que el registro se borró en Twenty, si se borró: un contacto eliminado no se contacta. */
  sourceDeletedAt?: Date | string | null;
}

export function isContactable(c: ContactabilityInput): boolean {
  return !c.doNotContact && !c.sourceDeletedAt;
}

/** Canal a usar, o `null` si no se puede contactar. Nunca devuelve canal con la supresión activa. */
export function resolveContactChannel(
  c: ContactabilityInput & { preferredContactChannel?: PreferredContactChannel | null },
): PreferredContactChannel | null {
  if (!isContactable(c)) return null;
  return c.preferredContactChannel ?? 'EMAIL';
}

export function contactSuppressed(): AppError {
  return new AppError({
    code: 'CONTACT_SUPPRESSED',
    kind: 'CONFLICT',
    message: 'Este contacto está marcado como «No contactar» en Twenty; no se le puede escribir ni llamar.',
  });
}

/** Lanza si el contacto no es contactable. Úsalo en TODO comando que pueda originar comunicación. */
export function assertContactable(c: ContactabilityInput): void {
  if (!isContactable(c)) throw contactSuppressed();
}
