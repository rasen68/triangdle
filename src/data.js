export async function loadWordLists() {
  const lengths = [2, 3, 4, 5, 6];
  const dictionaryEntries = await Promise.all(lengths.map(async (length) => {
    const response = await fetch(`data/allowed-${length}.txt`);
    if (!response.ok) throw new Error(`Could not load allowed-${length}.txt`);
    const text = await response.text();
    return [length, new Set(parseWords(text))];
  }));

  const targetResponse = await fetch('data/targets.txt');
  if (!targetResponse.ok) throw new Error('Could not load targets.txt');

  const targets = parseWords(await targetResponse.text()).filter((word) => word.length === 6);
  return { dictionaries: Object.fromEntries(dictionaryEntries), targets };
}

function parseWords(text) {
  return text.split(/\r?\n/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
}
