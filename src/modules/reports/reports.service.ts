import { eq, and, desc, lte } from 'drizzle-orm';
import { CronExpressionParser } from 'cron-parser';
import { db } from '../../infra/db/client.js';
import { reports, scheduledReports } from '../../infra/db/schema/reports.js';
import { uploadFile, getPresignedUrl } from '../../infra/storage/s3.js';
import { getQueue, createWorker } from '../../infra/queue/bull.js';
import { NotFoundError, AppError } from '../../shared/errors.js';
import * as analytics from '../analytics/analytics.service.js';
import type { ReportType } from '../../infra/db/schema/reports.js';

const reportQueue = getQueue('reports');

// ─── HTML Templates ──────────────────────────────────────────────────────────

function htmlWrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #1a1a2e; margin: 40px; font-size: 13px; }
    h1 { font-size: 22px; border-bottom: 2px solid #d97757; padding-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 24px; color: #d97757; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f6f4ee; text-align: left; padding: 8px; border-bottom: 1px solid #ccc; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
    .kpi-card { background: #f6f4ee; border-radius: 6px; padding: 12px; }
    .kpi-label { font-size: 11px; text-transform: uppercase; color: #666; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    .status-go { color: #1ec991; font-weight: 600; }
    .status-nogo { color: #ef4747; font-weight: 600; }
    .status-cond { color: #f5a524; font-weight: 600; }
  </style>
</head>
<body>
  <h1>FleetOps — ${title}</h1>
  <p style="color:#666;font-size:11px">Generated: ${new Date().toUTCString()}</p>
  ${body}
  <div class="footer">AR Technology — FleetOps Platform | Confidential</div>
</body>
</html>`;
}

async function buildFleetStatusHtml(orgId: string, _params: Record<string, unknown>): Promise<string> {
  const kpis = await analytics.getKPIs(orgId);
  const readiness = await analytics.getFleetReadiness(orgId);

  const kpiCards = `
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">Total Vehicles</div><div class="kpi-value">${kpis.totalVehicles}</div></div>
  <div class="kpi-card"><div class="kpi-label">Available</div><div class="kpi-value">${kpis.availableVehicles}</div></div>
  <div class="kpi-card"><div class="kpi-label">Utilization</div><div class="kpi-value">${kpis.utilizationPct}%</div></div>
  <div class="kpi-card"><div class="kpi-label">No-Go Rate</div><div class="kpi-value">${kpis.noGoRate}%</div></div>
  <div class="kpi-card"><div class="kpi-label">Active Incidents</div><div class="kpi-value">${kpis.activeIncidents}</div></div>
  <div class="kpi-card"><div class="kpi-label">Avg Driver Score</div><div class="kpi-value">${kpis.avgDriverScore}</div></div>
</div>`;

  const siteRows = readiness.map((s: Record<string, unknown>) =>
    `<tr><td>${s['site']}</td><td>${s['total']}</td><td>${s['available']}</td><td>${s['inUse']}</td><td>${s['maintenance']}</td><td>${s['noGo']}</td></tr>`
  ).join('');

  return htmlWrap('Fleet Status Report', `
    <h2>KPI Summary</h2>
    ${kpiCards}
    <h2>Site Breakdown</h2>
    <table>
      <tr><th>Site</th><th>Total</th><th>Available</th><th>In Use</th><th>Maintenance</th><th>No-Go</th></tr>
      ${siteRows}
    </table>
  `);
}

async function buildJourneySummaryHtml(orgId: string, params: Record<string, unknown>): Promise<string> {
  const from = (params['from'] as string) ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const to = (params['to'] as string) ?? new Date().toISOString();
  const stats = await analytics.getJourneyStats(orgId, from, to) as unknown as Record<string, unknown>;

  return htmlWrap('Journey Summary Report', `
    <p><strong>Period:</strong> ${from.split('T')[0]} to ${to.split('T')[0]}</p>
    <h2>Statistics</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Journeys</td><td>${stats['total'] ?? 0}</td></tr>
      <tr><td>Completed</td><td>${stats['completed'] ?? 0}</td></tr>
      <tr><td>On-Time %</td><td>${stats['onTimePct'] ?? 0}%</td></tr>
      <tr><td>Avg Duration (hrs)</td><td>${stats['avgDurationHrs'] ?? '-'}</td></tr>
    </table>
  `);
}

async function buildIncidentReportHtml(orgId: string, params: Record<string, unknown>): Promise<string> {
  const kpis = await analytics.getKPIs(orgId);
  const lti = await analytics.getLtiDays(orgId) as unknown as Record<string, unknown>;

  return htmlWrap('Incident Report', `
    <h2>Summary</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Active Incidents</td><td>${kpis.activeIncidents}</td></tr>
      <tr><td>Critical Events</td><td>${kpis.criticalEvents}</td></tr>
      <tr><td>Total Events</td><td>${kpis.totalEvents}</td></tr>
      <tr><td>LTI Days</td><td>${lti['ltiDays'] ?? 0}</td></tr>
    </table>
  `);
}

async function buildMaintenanceReportHtml(orgId: string, _params: Record<string, unknown>): Promise<string> {
  const kpis = await analytics.getKPIs(orgId);

  return htmlWrap('Maintenance Report', `
    <h2>Fleet Readiness</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>No-Go Rate</td><td>${kpis.noGoRate}%</td></tr>
      <tr><td>Available Vehicles</td><td>${kpis.availableVehicles} / ${kpis.totalVehicles}</td></tr>
    </table>
  `);
}

async function buildDriverPerformanceHtml(orgId: string, _params: Record<string, unknown>): Promise<string> {
  const kpis = await analytics.getKPIs(orgId);

  return htmlWrap('Driver Performance Report', `
    <h2>Summary</h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Average Driver Score</td><td>${kpis.avgDriverScore}</td></tr>
      <tr><td>Total Journeys</td><td>${kpis.journeysTotal}</td></tr>
      <tr><td>On-Time %</td><td>${kpis.onTimePct}%</td></tr>
    </table>
  `);
}

async function buildHtml(reportType: ReportType, orgId: string, params: Record<string, unknown>): Promise<string> {
  switch (reportType) {
    case 'fleet_status': return buildFleetStatusHtml(orgId, params);
    case 'journey_summary': return buildJourneySummaryHtml(orgId, params);
    case 'incident_report': return buildIncidentReportHtml(orgId, params);
    case 'maintenance_report': return buildMaintenanceReportHtml(orgId, params);
    case 'driver_performance': return buildDriverPerformanceHtml(orgId, params);
  }
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

async function generatePdf(html: string): Promise<Buffer> {
  // Dynamic import to avoid loading puppeteer at startup
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── Queue Worker ─────────────────────────────────────────────────────────────

interface ReportJobData {
  reportId: string;
  orgId: string;
  reportType: ReportType;
  params: Record<string, unknown>;
}

export function startReportWorker() {
  return createWorker<ReportJobData>('reports', async (job) => {
    const { reportId, orgId, reportType, params } = job.data;

    await db.update(reports).set({ status: 'generating' }).where(eq(reports.id, reportId));

    try {
      const html = await buildHtml(reportType, orgId, params);
      const pdf = await generatePdf(html);

      const fileKey = `reports/${orgId}/${reportType}/${reportId}.pdf`;
      await uploadFile(fileKey, pdf, 'application/pdf');

      await db.update(reports).set({
        status: 'ready',
        fileKey,
        fileSizeBytes: String(pdf.length),
        completedAt: new Date(),
      }).where(eq(reports.id, reportId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.update(reports).set({ status: 'failed', errorMessage: msg }).where(eq(reports.id, reportId));
    }
  }, { concurrency: 2 });
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function requestReport(orgId: string, userId: string, reportType: ReportType, params: Record<string, unknown> = {}) {
  const [report] = await db.insert(reports).values({
    orgId,
    reportType,
    params,
    requestedBy: userId,
    status: 'pending',
  }).returning();

  await reportQueue.add('generate', {
    reportId: report.id,
    orgId,
    reportType,
    params,
  });

  return report;
}

export async function getReport(orgId: string, reportId: string) {
  const result = await db.select().from(reports).where(and(eq(reports.id, reportId), eq(reports.orgId, orgId))).limit(1);
  if (!result[0]) throw new NotFoundError('Report not found');
  return result[0];
}

export async function listReports(orgId: string, limit = 25) {
  return db.select().from(reports).where(eq(reports.orgId, orgId)).orderBy(desc(reports.createdAt)).limit(limit);
}

export async function getReportDownloadUrl(orgId: string, reportId: string): Promise<string> {
  const report = await getReport(orgId, reportId);
  if (report.status !== 'ready' || !report.fileKey) throw new AppError('Report not ready', 409, 'REPORT_NOT_READY');
  return getPresignedUrl(report.fileKey, 3600);
}

// ─── Scheduled Reports ────────────────────────────────────────────────────────

export async function createScheduledReport(orgId: string, userId: string, input: {
  reportType: ReportType;
  cronExpression: string;
  params?: Record<string, unknown>;
  recipientUserIds?: string[];
}) {
  const nextRunAt = computeNextRun(input.cronExpression);

  const [sr] = await db.insert(scheduledReports).values({
    orgId,
    reportType: input.reportType,
    cronExpression: input.cronExpression,
    params: input.params ?? {},
    recipientUserIds: input.recipientUserIds ?? [],
    nextRunAt,
    createdBy: userId,
  }).returning();

  return sr;
}

export async function listScheduledReports(orgId: string) {
  return db.select().from(scheduledReports).where(eq(scheduledReports.orgId, orgId)).orderBy(desc(scheduledReports.createdAt));
}

export async function updateScheduledReport(orgId: string, id: string, input: Partial<{
  cronExpression: string;
  enabled: boolean;
  params: Record<string, unknown>;
  recipientUserIds: string[];
}>) {
  const updates: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.cronExpression) updates['nextRunAt'] = computeNextRun(input.cronExpression);

  const [sr] = await db.update(scheduledReports).set(updates).where(
    and(eq(scheduledReports.id, id), eq(scheduledReports.orgId, orgId))
  ).returning();
  if (!sr) throw new NotFoundError('Scheduled report not found');
  return sr;
}

export async function deleteScheduledReport(orgId: string, id: string) {
  await db.delete(scheduledReports).where(and(eq(scheduledReports.id, id), eq(scheduledReports.orgId, orgId)));
}

function computeNextRun(cron: string): Date {
  const interval = CronExpressionParser.parse(cron);
  return interval.next().toDate();
}

// ─── Cron Runner (called every minute by server) ──────────────────────────────

export async function runDueScheduledReports() {
  const now = new Date();

  const due = await db.select().from(scheduledReports).where(
    and(
      eq(scheduledReports.enabled, true),
      lte(scheduledReports.nextRunAt, now),
    )
  );

  for (const sr of due) {
    // Queue the report
    await requestReport(sr.orgId, sr.createdBy, sr.reportType as ReportType, (sr.params as Record<string, unknown>) ?? {});

    // Advance next run
    const nextRunAt = computeNextRun(sr.cronExpression);
    await db.update(scheduledReports).set({ lastRunAt: now, nextRunAt, updatedAt: now }).where(eq(scheduledReports.id, sr.id));
  }
}
