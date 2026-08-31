# Triangdle

Like Wordle, but in a right triangle. You're guessing a 6-letter word with one left-aligned guess of each length 1-6 plus one final guess.

Each length-*n* guess matches only against the first *n* letters of the real word must be a real word of length *n* (length 1 can be any letter). However, you can make the guesses in any order. Try to use the least number of *letters*, not guesses.

Gray/Yellow/Green work the same as in regular Wordle, except there are triangular pointers embedded to make up for the added triangular difficulty.

## Run

Because the dictionary files are loaded with `fetch`, run the app through a local HTTP server rather than opening `index.html` directly.

```bash
npm run words # get dictionaries
npm run serve # open server
```

Or, without npm:
```bash
python3 scripts/build_wordlists.py
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

`npm run words` downloads 12dicts and SCOWL and writes
`data/allowed-*.txt` and `data/targets.txt`. Those files are generated
and are not committed.
