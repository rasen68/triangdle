import {
  ROW_LENGTHS,
  evaluateGuess,
  isValidGuess,
  mergeKeyboardStatuses,
  chooseDailyTarget,
  chooseRandomTarget,
} from './game.js';
import { loadWordLists } from './data.js';

const state = {
  dictionaries: {},
  targets: [],
  target: '',
  puzzleNumber: null,
  randomGame: false,
  rows: ROW_LENGTHS.map((length) => ({ length, guess: '', submitted: false, evaluation: [] })),
  activeRow: 0,
  score: 0,
  gameOver: false,
  won: false,
  keyboard: {},
};

const els = {
  board: document.querySelector('#board'),
  keyboard: document.querySelector('#keyboard'),
  puzzleId: document.querySelector('#puzzle-id'),
  score: document.querySelector('#score'),
  status: document.querySelector('#status'),
  message: document.querySelector('#message'),
  share: document.querySelector('#share-btn'),
  random: document.querySelector('#new-game-btn'),
  help: document.querySelector('#help-btn'),
  dialog: document.querySelector('#help-dialog'),
};

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

init().catch((error) => {
  console.error(error);
  els.message.textContent = 'Could not load the word lists. Start this project from a local web server.';
  els.message.className = 'message bad';
});

async function init() {
  const data = await loadWordLists();
  state.dictionaries = data.dictionaries;
  state.targets = data.targets;
  startGame(false);
  document.addEventListener('keydown', onKeydown);
  els.random.addEventListener('click', () => startGame(true));
  els.help.addEventListener('click', () => els.dialog.showModal());
  els.share.addEventListener('click', shareResult);
}

function startGame(randomGame) {
  const selection = randomGame ? chooseRandomTarget(state.targets) : chooseDailyTarget(state.targets);
  state.target = selection.target;
  state.puzzleNumber = selection.number;
  state.randomGame = randomGame;
  state.rows = ROW_LENGTHS.map((length) => ({ length, guess: '', submitted: false, evaluation: [] }));
  state.activeRow = 0;
  state.score = 0;
  state.gameOver = false;
  state.won = false;
  state.keyboard = {};
  render();
  setMessage(randomGame ? 'Random puzzle' : 'Choose any row to begin.');
}

function render() {
  renderStats();
  renderBoard();
  renderKeyboard();
  els.share.disabled = !state.gameOver;
}

function renderStats() {
  els.puzzleId.textContent = state.randomGame ? 'Random' : `#${state.puzzleNumber}`;
  els.score.textContent = String(state.score);
  els.status.textContent = state.gameOver ? (state.won ? 'Won' : 'Lost') : 'Playing';
}

function renderBoard() {
  els.board.innerHTML = '';
  state.rows.forEach((row, index) => {
    const rowEl = document.createElement('div');
    rowEl.className = `row${index === state.activeRow && !state.gameOver && !row.submitted ? ' active' : ''}${row.submitted ? ' locked' : ''}`;
    rowEl.tabIndex = row.submitted || state.gameOver ? -1 : 0;
    rowEl.setAttribute('role', 'button');
    rowEl.setAttribute('aria-label', `${row.length}-letter row${row.submitted ? ', submitted' : ''}`);
    rowEl.addEventListener('click', () => selectRow(index));
    rowEl.addEventListener('focus', () => selectRow(index));

    for (let tileIndex = 0; tileIndex < row.length; tileIndex += 1) {
      const tile = document.createElement('div');
      const letter = row.guess[tileIndex] ?? '';
      const evaluation = row.evaluation[tileIndex];
      tile.className = `tile${letter ? ' filled' : ''}${evaluation ? ` ${evaluation.status}` : ''}`;
      tile.textContent = letter.toUpperCase();

      if (evaluation && evaluation.status !== 'absent') {
        addArrowStack(tile, 'left', evaluation.arrows.left);
        addArrowStack(tile, 'right', evaluation.arrows.right);
      }
      rowEl.appendChild(tile);
    }
    els.board.appendChild(rowEl);
  });
}

function addArrowStack(tile, direction, count) {
  if (!count) return;
  const stack = document.createElement('span');
  stack.className = `arrow-stack ${direction}`;
  for (let i = 0; i < count; i += 1) {
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = direction === 'left' ? '‹' : '›';
    stack.appendChild(arrow);
  }
  tile.appendChild(stack);
}

function renderKeyboard() {
  els.keyboard.innerHTML = '';
  KEYBOARD_ROWS.forEach((letters, rowIndex) => {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    if (rowIndex === 2) row.appendChild(keyButton('Enter', 'enter', 'wide'));
    for (const letter of letters) row.appendChild(keyButton(letter, letter));
    if (rowIndex === 2) row.appendChild(keyButton('⌫', 'backspace', 'wide'));
    els.keyboard.appendChild(row);
  });
}

function keyButton(label, key, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `key ${extraClass} ${state.keyboard[key] ?? ''}`.trim();
  button.textContent = label.toUpperCase();
  button.setAttribute('aria-label', label === '⌫' ? 'Backspace' : label);
  button.disabled = state.gameOver;
  button.addEventListener('click', () => handleKey(key));
  return button;
}

function selectRow(index) {
  if (state.gameOver || state.rows[index].submitted) return;
  state.activeRow = index;
  renderBoard();
}

function onKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'arrowup' || key === 'arrowdown') {
    event.preventDefault();
    moveActiveRow(key === 'arrowup' ? -1 : 1);
    return;
  }
  if (key === 'enter') {
    event.preventDefault();
    handleKey('enter');
    return;
  }
  if (key === 'backspace') {
    event.preventDefault();
    handleKey('backspace');
    return;
  }
  if (/^[a-z]$/.test(key)) {
    event.preventDefault();
    handleKey(key);
  }
}

function moveActiveRow(delta) {
  if (state.gameOver) return;
  let index = state.activeRow;
  for (let steps = 0; steps < state.rows.length; steps += 1) {
    index = (index + delta + state.rows.length) % state.rows.length;
    if (!state.rows[index].submitted) {
      selectRow(index);
      return;
    }
  }
}

function handleKey(key) {
  if (state.gameOver) return;
  const row = state.rows[state.activeRow];
  if (row.submitted) return;

  if (key === 'backspace') {
    row.guess = row.guess.slice(0, -1);
    renderBoard();
    return;
  }

  if (key === 'enter') {
    submitActiveRow();
    return;
  }

  if (/^[a-z]$/.test(key) && row.guess.length < row.length) {
    row.guess += key;
    renderBoard();
  }
}

function submitActiveRow() {
  const row = state.rows[state.activeRow];
  if (!isValidGuess(row.guess, row.length, state.dictionaries)) {
    setMessage(row.guess.length !== row.length ? `Enter exactly ${row.length} letter${row.length === 1 ? '' : 's'}.` : `"${row.guess.toUpperCase()}" is not in the dictionary.`, true);
    shakeRow();
    return;
  }

  row.evaluation = evaluateGuess(row.guess, state.target);
  row.submitted = true;
  state.score += row.length;
  state.keyboard = mergeKeyboardStatuses(state.keyboard, row.evaluation, row.guess);

  if (row.length === 6 && row.guess === state.target) {
    state.won = true;
    state.gameOver = true;
    render();
    setMessage(`You found ${state.target.toUpperCase()} in ${state.score}/27 letters.`, false, true);
    return;
  }

  if (state.rows.every((item) => item.submitted)) {
    state.gameOver = true;
    state.won = false;
    render();
    setMessage(`No match. The target was ${state.target.toUpperCase()}.`, true);
    return;
  }

  state.activeRow = findNextOpenRow(state.activeRow);
  render();
}

function findNextOpenRow(from) {
  for (let offset = 1; offset <= state.rows.length; offset += 1) {
    const index = (from + offset) % state.rows.length;
    if (!state.rows[index].submitted) return index;
  }
  return from;
}

function shakeRow() {
  const current = els.board.children[state.activeRow];
  current?.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-5px)' },
    { transform: 'translateX(5px)' },
    { transform: 'translateX(0)' },
  ], { duration: 180 });
}

function setMessage(text, bad = false, good = false) {
  els.message.textContent = text;
  els.message.className = `message${bad ? ' bad' : ''}${good ? ' good' : ''}`;
}

async function shareResult() {
  if (!state.gameOver) return;
  const puzzleId = state.randomGame ? 'Random game' : `Triangdle #${state.puzzleNumber}`;
  const score = state.won ? `${state.score} letters` : 'Loss';
  const grid = state.rows
    .filter((row) => row.submitted)
    .map((row) => row.evaluation.map((item) => item.status === 'exact' ? '🟩' : item.status === 'present' ? '🟨' : '⬜').join(''))
    .join('\n');
  const text = `${puzzleId}\nScore: ${score}\n\n${grid}`;

  try {
    await navigator.clipboard.writeText(text);
    setMessage('Result copied to clipboard.', false, true);
  } catch {
    window.prompt('Copy your result:', text);
  }
}
