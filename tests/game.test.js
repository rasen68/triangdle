import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGuess,
  isValidGuess,
  mergeKeyboardStatuses,
  dailyNumber,
  seededIndex,
} from '../src/game.js';

test('short guesses compare against the full target', () => {
  assert.deepEqual(
    evaluateGuess('aa', 'bbaaaa').map((x) => x.status),
    ['present', 'present'],
  );
});

test('exact matches are resolved before duplicate present matches', () => {
  assert.deepEqual(
    evaluateGuess('aaaaaa', 'abacad').map((x) => x.status),
    ['exact', 'absent', 'exact', 'absent', 'exact', 'absent'],
  );
});

test('directional arrows ignore exact and claimed target copies', () => {
  const result = evaluateGuess('aaaa', 'aaaaab');
  assert.equal(result[0].status, 'exact');
  assert.equal(result[0].arrows.right, 1);
  assert.equal(result[1].status, 'exact');
  assert.equal(result[1].arrows.right, 1);
  assert.equal(result[2].status, 'exact');
  assert.equal(result[2].arrows.right, 1);
});

test('one-letter row accepts any single ASCII letter', () => {
  assert.equal(isValidGuess('z', 1, {}), true);
  assert.equal(isValidGuess('ab', 1, {}), false);
});

test('dictionary validation requires the exact row length', () => {
  const dict = { 2: new Set(['an']), 3: new Set(['and']) };
  assert.equal(isValidGuess('an', 2, dict), true);
  assert.equal(isValidGuess('and', 2, dict), false);
  assert.equal(isValidGuess('foo', 3, dict), false);
});

test('keyboard status only improves', () => {
  const first = mergeKeyboardStatuses({}, evaluateGuess('ab', 'axxxxx'), 'ab');
  const second = mergeKeyboardStatuses(first, evaluateGuess('yx', 'xyyyyy'), 'xx');
  assert.equal(first.a, 'exact');
  assert.equal(first.b, 'absent');
  assert.equal(second.x, 'present');
  assert.equal(second.a, 'exact');
});

test('daily numbering uses Philly date', () => {
  // 2026-01-01 00:00 EST = 05:00 UTC → puzzle 1
  assert.equal(
    dailyNumber(new Date('2026-01-01T05:00:00.000Z')),
    1,
  );
  // 23:00 EST Jan 1 is already Jan 2 UTC; still puzzle 1
  assert.equal(
    dailyNumber(new Date('2026-01-02T04:00:00.000Z')),
    1,
  );
  // 2026-01-02 00:00 EST = 05:00 UTC → puzzle 2
  assert.equal(
    dailyNumber(new Date('2026-01-02T05:00:00.000Z')),
    2,
  );
});

test('daily numbering follows EDT after the spring-forward', () => {
  // 2026-07-01 00:00 EDT = 04:00 UTC
  const july1 = dailyNumber(new Date('2026-07-01T04:00:00.000Z'));
  // 23:00 EDT July 1 is already July 2 UTC; still July 1 in NY
  assert.equal(
    dailyNumber(new Date('2026-07-02T03:00:00.000Z')),
    july1,
  );
  // 2026-07-02 00:00 EDT = 04:00 UTC → next puzzle
  assert.equal(
    dailyNumber(new Date('2026-07-02T04:00:00.000Z')),
    july1 + 1,
  );
});

test('seeded index is deterministic and in range', () => {
  const a = seededIndex(42, 40);
  const b = seededIndex(42, 40);
  assert.equal(a, b);
  assert.ok(a >= 0 && a < 40);
});
