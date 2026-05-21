import type { FastifyReply } from 'fastify';

/**
 * Stream CSV to reply.
 * headers: column display names in order
 * rows: array of objects (keys matching headers)
 * keyMap: maps header name → object key (defaults to header.toLowerCase().replace(/ /g,'_'))
 */
export function exportCsv(
  reply: FastifyReply,
  headers: string[],
  rows: Record<string, unknown>[],
  filename: string,
  keyMap?: Record<string, string>,
): void {
  reply.raw.setHeader('Content-Type', 'text/csv; charset=utf-8');
  reply.raw.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Header row
  const csvHeader = headers.map(h => `"${h}"`).join(',') + '\r\n';
  reply.raw.write(csvHeader);

  for (const row of rows) {
    const line = headers.map(h => {
      const key = keyMap?.[h] ?? h.toLowerCase().replace(/\s+/g, '_');
      const val = row[key];
      if (val == null) return '';
      const str = val instanceof Date ? val.toISOString() : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',');
    reply.raw.write(line + '\r\n');
  }

  reply.raw.end();
}
