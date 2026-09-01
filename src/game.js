export const ROW_LENGTHS = [1, 2, 3, 4, 5, 6, 6];
export const STATUS_RANK = { absent: 0, present: 1, exact: 2 };

export function normalizeWord(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function evaluateGuess(guessInput, targetInput) {
  const guess = normalizeWord(guessInput);
  const target = normalizeWord(targetInput);
  const result = Array.from({ length: guess.length }, () => ({ status: 'absent', arrows: { left: 0, right: 0 } }));
  const targetChars = [...target];
  const claimed = Array(targetChars.length).fill(false);

  // Exact matches claim their target positions first.
  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === targetChars[i]) {
      result[i].status = 'exact';
      claimed[i] = true;
    }
  }

  // Present matches claim the earliest still-unclaimed target copy.
  for (let i = 0; i < guess.length; i += 1) {
    if (result[i].status === 'exact') continue;
    const targetIndex = targetChars.findIndex((char, index) => char === guess[i] && !claimed[index]);
    if (targetIndex >= 0) {
      result[i].status = 'present';
      claimed[targetIndex] = true;
    }
  }

  // Directional arrows point only to target copies which remain unclaimed.
  // Exact/present matched copies and exact matches elsewhere do not contribute.
  for (let i = 0; i < result.length; i += 1) {
    if (result[i].status === 'absent') continue;
    const letter = guess[i];
    const left = claimed.filter((used, targetIndex) => !used && targetChars[targetIndex] === letter && targetIndex < i).length;
    const right = claimed.filter((used, targetIndex) => !used && targetChars[targetIndex] === letter && targetIndex > i).length;
    result[i].arrows = { left, right };
  }

  return result;
}

export function isValidGuess(guessInput, rowLength, dictionaries) {
  const guess = normalizeWord(guessInput);
  if (guess.length !== rowLength) return false;
  if (rowLength === 1) return /^[a-z]$/.test(guess);
  return dictionaries[rowLength]?.has(guess) ?? false;
}

export function mergeKeyboardStatuses(current, evaluation, guess) {
  const next = { ...current };
  for (let i = 0; i < guess.length; i += 1) {
    const letter = guess[i];
    const status = evaluation[i]?.status;
    if (!status) continue;
    if ((STATUS_RANK[status] ?? -1) > (STATUS_RANK[next[letter]] ?? -1)) next[letter] = status;
  }
  return next;
}

const DAILY_TZ = 'America/New_York';

function civilDateInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const num = (type) =>
    Number(parts.find((part) => part.type === type).value);
  return {
    year: num('year'),
    month: num('month'),
    day: num('day'),
  };
}

export function dailyNumber(date = new Date()) {
  const { year, month, day } = civilDateInZone(date, DAILY_TZ);
  const start = Date.UTC(2026, 0, 1);
  const utc = Date.UTC(year, month - 1, day);
  return Math.floor((utc - start) / 86400000) + 1;
}

export function seededIndex(seed, length) {
  let hash = 2166136261 >>> 0;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % length;
}

export function chooseDailyTarget(targets, date = new Date()) {
  if (!targets.length) throw new Error('No target words configured.');
  const number = dailyNumber(date);
  return { number, target: targets[seededIndex(number, targets.length)] };
}

export function chooseRandomTarget(targets) {
  if (!targets.length) throw new Error('No target words configured.');
  const index = Math.floor(Math.random() * targets.length);
  return { number: null, target: targets[index] };
}
