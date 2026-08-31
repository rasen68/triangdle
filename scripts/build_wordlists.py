#!/usr/bin/env python3
'''Download 12dicts and SCOWL, then write data/*.txt.'''

from __future__ import annotations

import hashlib
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache' / 'wordlists'
DATA = ROOT / 'data'

TWELVE_DICTS_URL = (
    'https://downloads.sourceforge.net/project/wordlist/'
    '12Dicts/6.0/12dicts-6.0.2.zip'
)
TWELVE_DICTS_SHA256 = (
    '64ac1d35acb66b550c7ebc56e080b62e'
    '0bad8f5984d72059dc2e05ac48780e52'
)
TWELVE_DICTS_MEMBER = 'American/2of12.txt'

SCOWL_URL = (
    'https://downloads.sourceforge.net/project/wordlist/'
    'SCOWL/2020.12.07/scowl-2020.12.07.zip'
)
SCOWL_SHA256 = (
    'dc3435e1cb56f3394aea91b5d2ab5d10'
    'd80c98bc7dd88c3fccb7348f6ab913a0'
)
SCOWL_SPELLINGS = frozenset({
    'english', 'american', 'british', 'british_z',
})
SCOWL_SIZE = 80
SCOWL_WORDS_RE = re.compile(
    r'(?:^|/)final/(\w+)-words\.(\d\d)$'
)

USER_AGENT = 'triangdle-wordlist-builder/1.0'
ALLOWED_LENGTHS = (2, 3, 4, 5, 6)
TARGET_LENGTH = 6
DOWNLOAD_ATTEMPTS = 5


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)

    twelve_zip = download(
        TWELVE_DICTS_URL, CACHE / '12dicts-6.0.2.zip',
        TWELVE_DICTS_SHA256,
    )
    scowl_zip = download(
        SCOWL_URL, CACHE / 'scowl-2020.12.07.zip',
        SCOWL_SHA256,
    )

    targets = {
        word for word in read_zip_words(twelve_zip, TWELVE_DICTS_MEMBER)
        if len(word) == TARGET_LENGTH
    }
    allowed = {length: set() for length in ALLOWED_LENGTHS}
    for word in read_scowl_words(scowl_zip):
        if len(word) in allowed:
            allowed[len(word)].add(word)
    allowed[TARGET_LENGTH].update(targets)

    write_words(DATA / 'targets.txt', targets)
    for length in ALLOWED_LENGTHS:
        path = DATA / f'allowed-{length}.txt'
        write_words(path, allowed[length])

    print(f'targets {len(targets)}')
    for length in ALLOWED_LENGTHS:
        print(f'allowed-{length} {len(allowed[length])}')


def parse_word(line: str) -> str | None:
    word = line.strip().lower()
    if word.isascii() and word.isalpha():
        return word
    return None


def read_zip_words(zip_path: Path, member_suffix: str) -> set[str]:
    with zipfile.ZipFile(zip_path) as archive:
        name = zip_member(archive, member_suffix)
        text = archive.read(name).decode('latin-1')
    return words_from_text(text)


def read_scowl_words(zip_path: Path) -> set[str]:
    words: set[str] = set()
    with zipfile.ZipFile(zip_path) as archive:
        for name in archive.namelist():
            match = SCOWL_WORDS_RE.search(name.replace('\\', '/'))
            if match is None:
                continue
            spelling = match.group(1)
            size = int(match.group(2))
            if spelling not in SCOWL_SPELLINGS or size > SCOWL_SIZE:
                continue
            text = archive.read(name).decode('latin-1')
            words.update(words_from_text(text))
    if not words:
        raise RuntimeError(f'no SCOWL words in {zip_path}')
    return words


def words_from_text(text: str) -> set[str]:
    words: set[str] = set()
    for line in text.splitlines():
        word = parse_word(line)
        if word is not None:
            words.add(word)
    return words


def zip_member(archive: zipfile.ZipFile, suffix: str) -> str:
    suffix = suffix.lstrip('/')
    hits = [
        name for name in archive.namelist()
        if name.replace('\\', '/').endswith(suffix)
    ]
    if not hits:
        raise FileNotFoundError(
            f'{suffix} not in {archive.filename}'
        )
    return hits[0]


def write_words(path: Path, words: set[str]) -> None:
    text = '\n'.join(sorted(words))
    if text:
        text += '\n'
    path.write_text(text, encoding='ascii')


def download(url: str, dest: Path, sha256: str) -> Path:
    if dest.exists() and checksum(dest) == sha256:
        return dest
    if dest.exists():
        dest.unlink()

    last_error: Exception | None = None
    part = dest.with_suffix(dest.suffix + '.part')
    for attempt in range(DOWNLOAD_ATTEMPTS):
        try:
            print(f'download {dest.name} ({attempt + 1})', flush=True)
            fetch_to(url, part)
            digest = checksum(part)
            if digest != sha256:
                raise RuntimeError(
                    f'checksum mismatch for {dest.name}: {digest}'
                )
            part.replace(dest)
            return dest
        except Exception as error:
            last_error = error
            if part.exists():
                part.unlink()
            time.sleep(2 ** attempt)
    raise RuntimeError(f'could not download {url}') from last_error


def fetch_to(url: str, dest: Path) -> None:
    curl = shutil.which('curl')
    if curl is not None:
        subprocess.run(
            [
                curl, '-fsSL', '--retry', '3', '--retry-delay', '2',
                '-A', USER_AGENT, '-o', str(dest), url,
            ],
            check=True,
        )
        return
    request = urllib.request.Request(
        url, headers={'User-Agent': USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        dest.write_bytes(response.read())


def checksum(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
