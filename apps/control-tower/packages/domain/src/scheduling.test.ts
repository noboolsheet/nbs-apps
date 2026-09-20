import { describe, it, expect } from 'vitest';
import { taskDateBucket, taskBoardBucket, priorityRank } from './scheduling';

const TODAY = '2026-08-12';
const WEEK_END = '2026-08-19';

describe('taskDateBucket', () => {
  it('clasifica por fecha', () => {
    expect(taskDateBucket(null, TODAY, WEEK_END)).toBe('NO_DATE');
    expect(taskDateBucket('2026-08-10', TODAY, WEEK_END)).toBe('OVERDUE');
    expect(taskDateBucket('2026-08-12', TODAY, WEEK_END)).toBe('TODAY');
    expect(taskDateBucket('2026-08-15', TODAY, WEEK_END)).toBe('THIS_WEEK');
    expect(taskDateBucket('2026-08-19', TODAY, WEEK_END)).toBe('THIS_WEEK');
    expect(taskDateBucket('2026-08-20', TODAY, WEEK_END)).toBe('UPCOMING');
  });
});

describe('taskBoardBucket', () => {
  it('overdue tiene precedencia sobre blocked', () => {
    expect(taskBoardBucket('BLOCKED', '2026-08-10', TODAY, WEEK_END)).toBe('OVERDUE');
  });
  it('blocked (no vencida) va a su bucket', () => {
    expect(taskBoardBucket('BLOCKED', '2026-08-15', TODAY, WEEK_END)).toBe('BLOCKED');
    expect(taskBoardBucket('BLOCKED', null, TODAY, WEEK_END)).toBe('BLOCKED');
  });
  it('activa normal usa el bucket por fecha', () => {
    expect(taskBoardBucket('TODO', '2026-08-12', TODAY, WEEK_END)).toBe('TODAY');
    expect(taskBoardBucket('IN_PROGRESS', '2026-08-30', TODAY, WEEK_END)).toBe('UPCOMING');
  });
});

describe('priorityRank', () => {
  it('ordena URGENT > HIGH > MEDIUM > LOW', () => {
    expect(priorityRank('URGENT')).toBeGreaterThan(priorityRank('HIGH'));
    expect(priorityRank('HIGH')).toBeGreaterThan(priorityRank('MEDIUM'));
    expect(priorityRank('MEDIUM')).toBeGreaterThan(priorityRank('LOW'));
    expect(priorityRank('UNKNOWN')).toBe(0);
  });
});
