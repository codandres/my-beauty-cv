import { describe, expect, it } from 'vitest';
import { filledSteps } from './partials';

describe('filledSteps', () => {
  it.each([
    [0, 5, 0],
    [100, 5, 5],
    [83, 5, 4],
    [60, 10, 6],
    [80, 10, 8],
  ])('level %i over %i steps fills %i', (level, count, filled) => {
    expect(filledSteps(level, count)).toBe(filled);
  });
});
