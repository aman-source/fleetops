import { describe, it, expect, vi } from 'vitest';
import { exportCsv } from '../../src/shared/csv.js';

// Mock reply with raw stream
function mockReply() {
  const chunks: string[] = [];
  return {
    raw: {
      setHeader: vi.fn(),
      write: (chunk: string) => chunks.push(chunk),
      end: vi.fn(),
    },
    _chunks: chunks,
  };
}

describe('exportCsv', () => {
  it('writes header row with quoted column names', () => {
    const reply = mockReply();
    exportCsv(reply as never, ['Name', 'Status'], [], 'test.csv');
    expect(reply._chunks[0]).toBe('"Name","Status"\r\n');
  });

  it('writes data rows using keyMap', () => {
    const reply = mockReply();
    const rows = [{ plateNo: '12-A-3471', status: 'available' }];
    exportCsv(reply as never, ['Plate No', 'Status'], rows, 'test.csv', { 'Plate No': 'plateNo', 'Status': 'status' });
    expect(reply._chunks[1]).toBe('"12-A-3471","available"\r\n');
  });

  it('escapes double quotes in values', () => {
    const reply = mockReply();
    const rows = [{ name: 'O\'Brien, "Jack"' }];
    exportCsv(reply as never, ['Name'], rows, 'test.csv', { 'Name': 'name' });
    expect(reply._chunks[1]).toContain('""Jack""');
  });

  it('handles null values as empty field (no quotes)', () => {
    const reply = mockReply();
    const rows = [{ status: null }];
    exportCsv(reply as never, ['Status'], rows, 'test.csv', { 'Status': 'status' });
    expect(reply._chunks[1]).toBe('\r\n');
  });

  it('sets correct Content-Type header', () => {
    const reply = mockReply();
    exportCsv(reply as never, ['Col'], [], 'export.csv');
    expect(reply.raw.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
  });

  it('sets Content-Disposition with filename', () => {
    const reply = mockReply();
    exportCsv(reply as never, ['Col'], [], 'my-report.csv');
    expect(reply.raw.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="my-report.csv"');
  });
});
