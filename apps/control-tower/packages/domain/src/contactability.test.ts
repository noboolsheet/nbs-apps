import { describe, it, expect } from 'vitest';
import { assertContactable, isContactable, resolveContactChannel } from './contactability';

describe('supresión de comunicaciones (handoff §10)', () => {
  it('«No contactar» bloquea, y bloquea por encima del canal preferido', () => {
    expect(isContactable({ doNotContact: true })).toBe(false);
    expect(resolveContactChannel({ doNotContact: true, preferredContactChannel: 'WHATSAPP' })).toBeNull();
    expect(() => assertContactable({ doNotContact: true })).toThrow(/No contactar/);
  });

  it('un contacto borrado en Twenty tampoco se contacta', () => {
    expect(isContactable({ doNotContact: false, sourceDeletedAt: new Date() })).toBe(false);
  });

  it('con la supresión apagada, manda el canal preferido', () => {
    expect(resolveContactChannel({ doNotContact: false, preferredContactChannel: 'LINKEDIN' })).toBe('LINKEDIN');
    expect(resolveContactChannel({ doNotContact: false })).toBe('EMAIL');
    expect(() => assertContactable({ doNotContact: false })).not.toThrow();
  });
});
