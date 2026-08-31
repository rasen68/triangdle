# Triangdle

Like Wordle, but in a right triangle.

## Run

Because the dictionary files are loaded with `fetch`, run the app through a local HTTP server rather than opening `index.html` directly. We also have

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

`npm run words` downloads 12dicts and SCOWL into `.cache/` and writes
`data/allowed-*.txt` and `data/targets.txt`. Those files are generated
and are not committed.
