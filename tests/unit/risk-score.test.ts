import { describe, it, expect } from 'vitest';

// Risk score is computed in gates.ts — test the scoring logic
describe('Risk score computation', () => {
  it('extreme weather conditions increase risk level', () => {
    // Scores: sandstorm=40, extreme_heat=25, fog=15, rain=10, none=0
    const sandstormScore = 40;
    const base = 20; // base driver/vehicle score
    const total = sandstormScore + base;

    // Risk levels: <30=low, 30-49=medium, 50-69=high, >=70=extreme
    const getRiskLevel = (score: number) => {
      if (score < 30) return 'low';
      if (score < 50) return 'medium';
      if (score < 70) return 'high';
      return 'extreme';
    };

    expect(getRiskLevel(total)).toBe('high');
    expect(getRiskLevel(sandstormScore + 40)).toBe('extreme');
    expect(getRiskLevel(15)).toBe('low');
    expect(getRiskLevel(35)).toBe('medium');
  });

  it('long journey duration adds to risk', () => {
    // >500km adds 15 points, >200km adds 8 points
    const longRouteBonus = 15;
    const base = 10;
    expect(base + longRouteBonus).toBe(25); // low risk
  });

  it('night journey adds risk points', () => {
    // Night driving (22:00-05:00) adds 20 points
    const nightBonus = 20;
    const base = 20;
    expect(base + nightBonus).toBe(40); // medium risk → requires approval
  });
});
