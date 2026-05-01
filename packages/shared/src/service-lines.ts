// Single source of truth for the five service lines Stigg sells.
// UI labels, icons, and capability flags live here so they don't drift.

export const SERVICE_LINES = [
  'guarding',
  'surveillance',
  'virtual_guard',
  'it_security',
  'secure_transport',
] as const;

export type ServiceLine = (typeof SERVICE_LINES)[number];

export const SERVICE_LINE_LABEL: Record<ServiceLine, string> = {
  guarding:          'Security Guard Services',
  surveillance:      'Surveillance & Alarm Systems',
  virtual_guard:     'Virtual Security Guard',
  it_security:       'IT Support & Cybersecurity',
  secure_transport:  'Secure Transport',
};

export const SERVICE_LINE_BLURB: Record<ServiceLine, string> = {
  guarding:          'Licensed on-site officers — uniformed, armed/unarmed, mobile patrol, event coverage.',
  surveillance:      'HD IP cameras, alarm panels, NVR, install + maintenance.',
  virtual_guard:     'AI-monitored remote guarding with talk-down audio and rapid-response escalation.',
  it_security:       'Managed cybersecurity, SIEM-lite, patching, PIPEDA breach response.',
  secure_transport:  'Marked vehicles, dual-officer chain-of-custody for cash, documents, and high-value cargo.',
};
