import { z } from 'zod';
import { PAYMENT_DIRECTION, PAYMENT_STATUS } from '@ct/domain';

/**
 * Esquemas de la sección **Pagos**. Un pago es dinero pendiente de entrar (IN, te lo deben) o de salir (OUT, lo debes).
 * La coherencia entre `direction` y a quién apunta el pago la aplica el comando: aquí sólo se valida la forma.
 */

const concept = z.string().trim().min(1).max(200);
/** Importe con 2 decimales. Se admite negativo NO: la dirección ya dice el sentido del dinero. */
const amount = z.coerce.number().min(0).max(1_000_000_000);

export const createPaymentSchema = z.object({
  concept,
  direction: z.enum(PAYMENT_DIRECTION).default('IN'),
  status: z.enum(PAYMENT_STATUS).default('PENDING'),
  amount,
  currencyCode: z.string().trim().length(3).toUpperCase().default('EUR'),
  clientId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  payeeLabel: z.string().trim().max(200).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().trim().max(5000).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/** Edición de metadatos (el estado va por su propio endpoint, como en el resto de entidades). */
export const updatePaymentSchema = z.object({
  concept: concept.optional(),
  direction: z.enum(PAYMENT_DIRECTION).optional(),
  amount: amount.optional(),
  currencyCode: z.string().trim().length(3).toUpperCase().optional(),
  clientId: z.string().uuid().nullish(),
  contactId: z.string().uuid().nullish(),
  payeeLabel: z.string().trim().max(200).nullish(),
  dueDate: z.coerce.date().nullish(),
  notes: z.string().trim().max(5000).nullish(),
});
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export const updatePaymentStatusSchema = z.object({ status: z.enum(PAYMENT_STATUS) });
