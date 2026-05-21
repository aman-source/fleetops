/**
 * Notification templates keyed by event type.
 * Variables interpolated via {{varName}} replacement.
 */

export interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
  sms: string;
}

const templates: Record<string, NotificationTemplate> = {
  panic: {
    subject: '🚨 PANIC: Vehicle {{vehicleId}} activated panic button',
    html: `<h2 style="color:#ef4747">🚨 Panic Alert</h2>
<p>Vehicle <strong>{{vehicleId}}</strong> activated the panic button at <strong>{{lat}}, {{lon}}</strong>.</p>
<p>Driver: {{driverId}}<br>Journey: {{journeyId}}<br>Time: {{time}}</p>
<p style="color:#ef4747">Immediate response required.</p>`,
    text: 'PANIC: Vehicle {{vehicleId}} activated panic at {{lat}},{{lon}}. Driver: {{driverId}}. Time: {{time}}.',
    sms: 'PANIC: Vehicle {{vehicleId}} at {{lat}},{{lon}}. Immediate response needed. FleetOps',
  },

  route_deviation: {
    subject: 'Route Deviation — Journey {{journeyId}}',
    html: `<h2>Route Deviation Detected</h2>
<p>Vehicle <strong>{{vehicleId}}</strong> has deviated from the approved route.</p>
<p>Journey: {{journeyId}}<br>Position: {{lat}}, {{lon}}</p>`,
    text: 'Route deviation: Vehicle {{vehicleId}} off-route. Journey {{journeyId}}. Position: {{lat}},{{lon}}.',
    sms: 'Route deviation: Vehicle {{vehicleId}} off approved route. Check FleetOps.',
  },

  gate_blocked: {
    subject: 'Journey Gate Blocked — {{journeyNo}}',
    html: `<h2>Journey Cannot Depart</h2>
<p>Journey <strong>{{journeyNo}}</strong> has a blocked gate:</p>
<p><strong>Gate {{gate}}:</strong> {{reason}}</p>`,
    text: 'Journey {{journeyNo}} blocked at Gate {{gate}}: {{reason}}',
    sms: 'Journey {{journeyNo}} blocked. Gate {{gate}}: {{reason}}. FleetOps',
  },

  document_expiring: {
    subject: 'Document Expiring: {{documentName}} for {{entityId}}',
    html: `<h2>Document Expiry Warning</h2>
<p>Document <strong>{{documentName}}</strong> for <strong>{{entityType}} {{entityId}}</strong> expires on <strong>{{expiryDate}}</strong>.</p>
<p>Please renew before the expiry to avoid operational disruption.</p>`,
    text: 'Document expiring: {{documentName}} expires {{expiryDate}}. Entity: {{entityId}}.',
    sms: 'Doc expiry: {{documentName}} expires {{expiryDate}}. Renew now. FleetOps',
  },

  conditional_expired: {
    subject: 'Conditional Release Expired — Vehicle {{vehicleId}}',
    html: `<h2>Conditional Release Expired</h2>
<p>Vehicle <strong>{{vehicleId}}</strong> conditional release has expired. Status reverted to No-Go.</p>`,
    text: 'Vehicle {{vehicleId}} conditional release expired. Status: No-Go.',
    sms: 'Vehicle {{vehicleId}} conditional expired. Now No-Go. FleetOps',
  },

  work_order_critical: {
    subject: 'Critical Work Order: {{woNumber}}',
    html: `<h2>Critical Work Order Created</h2>
<p>Work order <strong>{{woNumber}}</strong> (priority: CRITICAL) has been opened for vehicle <strong>{{vehicleId}}</strong>.</p>
<p>Issue: {{issueType}}<br>Description: {{description}}</p>`,
    text: 'Critical WO {{woNumber}} for vehicle {{vehicleId}}. Issue: {{issueType}}.',
    sms: 'CRITICAL WO {{woNumber}}: {{vehicleId}} - {{issueType}}. FleetOps',
  },

  journey_approved: {
    subject: 'Journey Approved — {{journeyNo}}',
    html: `<h2>Journey Approved</h2>
<p>Journey <strong>{{journeyNo}}</strong> has been fully approved and is ready for departure.</p>`,
    text: 'Journey {{journeyNo}} approved. Ready for departure.',
    sms: 'Journey {{journeyNo}} approved. Depart when ready. FleetOps',
  },
};

export function getTemplate(eventType: string): NotificationTemplate | null {
  return templates[eventType] ?? null;
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}
