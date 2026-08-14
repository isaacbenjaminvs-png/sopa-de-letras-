'use strict';

const CATEGORIES = {
  animales: {
    name: '🐶 Animales',
    words: ['PERRO','GATO','LEON','TIGRE','ELEFANTE','JIRAFA','CABALLO','DELFIN','LOBO','OSO','CONEJO','RATON','SERPIENTE','AGUILA','TORTUGA','CERDO','VACA','ZORRO','PANDA','RANA']
  },
  tecnologia: {
    name: '💻 Tecnología',
    words: ['COMPUTADORA','JAVASCRIPT','INTERNET','PROGRAMA','TECLADO','PANTALLA','SERVIDOR','SOFTWARE','CODIGO','MOUSE','MEMORIA','NAVEGADOR','DATOS','ROBOT','VIDEOJUEGO','ALGORITMO','SISTEMA','REDES','CIBERNETICA','MONITOR']
  },
  videojuegos: {
    name: '🎮 Videojuegos',
    words: ['MARIO','ZELDA','PACMAN','SONIC','POKEMON','MINECRAFT','FORTNITE','PONG','METROID','KIRBY','LINK','MARIOKART','DOOM','PORTAL','HALO','CUPHEAD','TETRIS','SONICX','PACMANIA','SIMON']
  },
  paises: {
    name: '🌎 Países',
    words: ['MEXICO','ESPANA','ARGENTINA','BRASIL','CANADA','JAPON','CHINA','FRANCIA','ITALIA','ALEMANIA','PERU','CHILE','COLOMBIA','EGIPTO','INDIA','PORTUGAL','GRECIA','RUSIA','AUSTRALIA','NORUEGA']
  },
  educacion: {
    name: '📚 Educación',
    words: ['ESCUELA','LIBRO','MAESTRO','MATEMATICAS','CIENCIAS','HISTORIA','GEOGRAFIA','LECTURA','ESCRITURA','ESTUDIO','TAREA','EXAMEN','APRENDER','CIENCIA','IDIOMA','NUMEROS','LETRAS','CONOCIMIENTO','DICCIONARIO','SABER']
  },
  deportes: {
    name: '⚽ Deportes',
    words: ['FUTBOL','BASQUET','TENIS','NATACION','CICLISMO','BOXEO','VOLEIBOL','BEISBOL','ATLETISMO','AJEDREZ','GOLF','RUGBY','PATINAJE','SURF','ESGRIMA','GIMNASIA','CARRERA','REMO','JUDO','HOCKEY']
  }
};

const LEVELS = {
  facil: { name: 'Fácil', size: 8, words: 5, time: 300, diagonals: false },
  medio: { name: 'Medio', size: 10, words: 8, time: 240, diagonals: true },
  dificil: { name: 'Difícil', size: 15, words: 12, time: 180, diagonals: true }
};

const LEVEL_ORDER = ['facil', 'medio', 'dificil'];

const DIRS = {
  E: [0, 1],
  W: [0, -1],
  S: [1, 0],
  N: [-1, 0],
  SE: [1, 1],
  NW: [-1, -1],
  SW: [1, -1],
  NE: [-1, 1]
};

const state = {
  category: null,
  level: null,
  board: [],
  boardSize: 0,
  words: [],
  pendingWords: [],
  score: 0,
  timeLeft: 0,
  totalTime: 0,
  running: false,
  paused: false,
  over: false,
  won: false,
  foundCount: 0,
  selecting: false,
  selectedCells: [],
  bonusEarned: 0,
  soundOn: true
};

const $ = id => document.getElementById(id);

const el = {
  screenMenu: $('screen-menu'),
  screenGame: $('screen-game'),
  gridContainer: $('grid-container'),
  wordList: $('word-list'),
  hudScore: $('hud-score'),
  hudTime: $('hud-time'),
  hudFound: $('hud-found'),
  categoryButtons: $('category-buttons'),
  levelButtons: $('level-buttons'),
  btnStart: $('btn-start'),
  btnSoundMenu: $('btn-sound-menu'),
  btnSoundGame: $('btn-sound-game'),
  btnNewGame: $('btn-newgame'),
  btnRestart: $('btn-restart'),
  btnPause: $('btn-pause'),
  overlayPause: $('overlay-pause'),
  btnResume: $('btn-resume'),
  btnRestartPause: $('btn-restart-pause'),
  btnMenuPause: $('btn-menu-pause'),
  overlayVictory: $('overlay-victory'),
  btnAgain: $('btn-again'),
  btnNext: $('btn-next'),
  victoryScore: $('victory-score'),
  victoryTime: $('victory-time'),
  victoryFound: $('victory-found'),
  overlayGameOver: $('overlay-gameover'),
  btnNewGameOver: $('btn-newgame-over'),
  overScore: $('over-score'),
  overFound: $('over-found'),
  overlayNeedSelection: $('overlay-needselection'),
  btnOkNeedSelection: $('btn-ok-needselection'),
  statBest: $('stat-best'),
  statLevel: $('stat-level'),
  statGames: $('stat-games'),
  statTime: $('stat-time')
};

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, start, duration, type = 'sine', gain = 0.18) {
  if (!state.soundOn || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
  g.gain.setValueAtTime(gain, audioCtx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + start + duration
  );

  osc.connect(g);
  g.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration);
}

const sounds = {
  select() {
    playTone(520, 0, 0.08, 'triangle', 0.12);
  },

  found() {
    playTone(523, 0, 0.12, 'triangle', 0.2);
    playTone(659, 0.1, 0.12, 'triangle', 0.2);
    playTone(784, 0.2, 0.2, 'triangle', 0.2);
  },

  error() {
    playTone(160, 0, 0.3, 'sawtooth', 0.12);
  },

  victory() {
    playTone(523, 0, 0.15, 'triangle', 0.2);
    playTone(659, 0.15, 0.15, 'triangle', 0.2);
    playTone(784, 0.3, 0.15, 'triangle', 0.2);
    playTone(1047, 0.45, 0.35, 'triangle', 0.25);
  },

  defeat() {
    playTone(392, 0, 0.2, 'sawtooth', 0.15);
    playTone(330, 0.2, 0.2, 'sawtooth', 0.15);
    playTone(262, 0.4, 0.4, 'sawtooth', 0.15);
  }
};

const SAVE_KEY = 'sopaDeLetrasProgress';

function defaultProgress() {
  return {
    bestScore: 0,
    unlockedLevel: 'facil',
    gamesCompleted: 0,
    bestTime: null
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) return defaultProgress();

    const data = JSON.parse(raw);

    return Object.assign(defaultProgress(), data);
  } catch (e) {
    return defaultProgress();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch (e) {}
}

let progress = loadProgress();

function updateStatsUI() {
  el.statBest.textContent = progress.bestScore;
  el.statLevel.textContent = LEVELS[progress.unlockedLevel].name;
  el.statGames.textContent = progress.gamesCompleted;
  el.statTime.textContent =
    progress.bestTime != null
      ? formatTime(progress.bestTime)
      : '--:--';
}

function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec));

  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');

  return `${m}:${s}`;
}

function shuffle(arr) {
  const a = arr.slice();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function randomLetter() {
  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[
    Math.floor(Math.random() * 26)
  ];
}

function tryPlaceWord(board, size, word, diagonals) {
  const dirs = diagonals
    ? Object.values(DIRS)
    : [DIRS.E, DIRS.W, DIRS.S, DIRS.N];

  const placements = shuffle(dirs.map((d, i) => i));

  for (const dIdx of placements) {
    const [dr, dc] = dirs[dIdx];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const endR = r + dr * (word.length - 1);
        const endC = c + dc * (word.length - 1);

        if (
          endR < 0 ||
          endR >= size ||
          endC < 0 ||
          endC >= size
        ) {
          continue;
        }

        let fits = true;
        const path = [];

        for (let k = 0; k < word.length; k++) {
          const cr = r + dr * k;
          const cc = c + dc * k;
          const existing = board[cr][cc];

          if (existing !== '' && existing !== word[k]) {
            fits = false;
            break;
          }

          path.push({ r: cr, c: cc });
        }

        if (fits) {
          for (let k = 0; k < word.length; k++) {
            board[r + dr * k][c + dc * k] = word[k];
          }

          return path;
        }
      }
    }
  }

  return null;
}

function generateBoard(levelKey, category) {
  const level = LEVELS[levelKey];
  const size = level.size;

  const wordPool = shuffle(CATEGORIES[category].words)
    .filter(w => w.length <= size)
    .slice(0, level.words);

  state.boardSize = size;

  const board = Array.from(
    { length: size },
    () => Array(size).fill('')
  );

  const placed = [];

  for (const word of wordPool) {
    const path = tryPlaceWord(
      board,
      size,
      word,
      level.diagonals
    );

    if (path) {
      placed.push({
        word,
        path
      });
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === '') {
        board[r][c] = randomLetter();
      }
    }
  }

  state.board = board;
  state.words = placed;
  state.pendingWords = placed.map(p => p.word);
}

function renderGrid() {
  const size = state.board.length;

  el.gridContainer.style.gridTemplateColumns =
    `repeat(${size}, var(--cell-size))`;

  el.gridContainer.innerHTML = '';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');

      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.textContent = state.board[r][c];

      el.gridContainer.appendChild(cell);
    }
  }

  attachCellEvents();
}

function renderWordList() {
  el.wordList.innerHTML = '';

  for (const w of state.words) {
    const chip = document.createElement('div');

    chip.className =
      'word-chip' + (w.found ? ' found' : '');

    chip.textContent = w.word;
    chip.dataset.word = w.word;

    el.wordList.appendChild(chip);
  }
}

function updateHUD() {
  el.hudScore.textContent = state.score;
  el.hudTime.textContent = formatTime(state.timeLeft);
  el.hudFound.textContent =
    `${state.foundCount}/${state.words.length}`;
}

function getCellNode(r, c) {
  return el.gridContainer.querySelector(
    `.cell[data-r="${r}"][data-c="${c}"]`
  );
}

function clearSelection() {
  for (const { r, c } of state.selectedCells) {
    const node = getCellNode(r, c);

    if (node) {
      node.classList.remove('selected');
    }
  }

  state.selectedCells = [];
}

function addToSelection(r, c) {
  if (
    r < 0 ||
    c < 0 ||
    r >= state.boardSize ||
    c >= state.boardSize
  ) {
    return;
  }

  const exists = state.selectedCells.some(
    cell => cell.r === r && cell.c === c
  );

  if (exists) return;

  state.selectedCells.push({ r, c });

  const node = getCellNode(r, c);

  if (node) {
    node.classList.add('selected');
  }

  sounds.select();
}

function getCellFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);

  if (!element) return null;

  const cell = element.closest('.cell');

  if (!cell || !el.gridContainer.contains(cell)) {
    return null;
  }

  return {
    r: parseInt(cell.dataset.r, 10),
    c: parseInt(cell.dataset.c, 10)
  };
}

function getLineCells(start, end) {
  const dr = end.r - start.r;
  const dc = end.c - start.c;

  const absR = Math.abs(dr);
  const absC = Math.abs(dc);

  if (!(dr === 0 || dc === 0 || absR === absC)) {
    return [];
  }

  const stepR = dr === 0 ? 0 : dr / absR;
  const stepC = dc === 0 ? 0 : dc / absC;

  const length = Math.max(absR, absC) + 1;

  const cells = [];

  for (let i = 0; i < length; i++) {
    cells.push({
      r: start.r + stepR * i,
      c: start.c + stepC * i
    });
  }

  return cells;
}

function updateSelection(endCell) {
  if (
    !state.selecting ||
    state.selectedCells.length === 0
  ) {
    return;
  }

  const startCell = state.selectedCells[0];

  const cells = getLineCells(
    startCell,
    endCell
  );

  if (cells.length === 0) return;

  for (const { r, c } of state.selectedCells) {
    const node = getCellNode(r, c);

    if (node) {
      node.classList.remove('selected');
    }
  }

  state.selectedCells = [];

  for (const cell of cells) {
    addToSelection(cell.r, cell.c);
  }
}

function startSelection(e) {
  if (
    !state.running ||
    state.paused ||
    state.over
  ) {
    return;
  }

  e.preventDefault();

  initAudio();

  const cell = getCellFromPoint(
    e.clientX,
    e.clientY
  );

  if (!cell) return;

  state.selecting = true;

  clearSelection();

  addToSelection(
    cell.r,
    cell.c
  );
}

function moveSelection(e) {
  if (!state.selecting) return;

  e.preventDefault();

  const cell = getCellFromPoint(
    e.clientX,
    e.clientY
  );

  if (!cell) return;

  updateSelection(cell);
}

function finishSelection(e) {
  if (!state.selecting) return;

  if (e) {
    e.preventDefault();
  }

  state.selecting = false;

  evaluateSelection();

  clearSelection();
}

function attachCellEvents() {
  el.gridContainer.style.touchAction = 'none';
  el.gridContainer.style.userSelect = 'none';
  el.gridContainer.style.webkitUserSelect = 'none';

  el.gridContainer.onpointerdown = startSelection;
  el.gridContainer.onpointermove = moveSelection;
  el.gridContainer.onpointerup = finishSelection;
  el.gridContainer.onpointercancel = finishSelection;

  document.onpointerup = finishSelection;
}

function selectionString() {
  return state.selectedCells
    .map(({ r, c }) => state.board[r][c])
    .join('');
}

function evaluateSelection() {
  if (state.selectedCells.length < 2) return;

  const selected =
    selectionString().toUpperCase();

  const reversed =
    selected.split('').reverse().join('');

  const matched =
    state.pendingWords.find(
      w => w === selected || w === reversed
    );

  if (matched) {
    markWordFound(matched);
  } else {
    applyError();
  }
}

function markWordFound(word) {
  const wObj =
    state.words.find(w => w.word === word);

  if (!wObj || wObj.found) return;

  wObj.found = true;

  state.pendingWords =
    state.pendingWords.filter(w => w !== word);

  state.foundCount++;

  for (const { r, c } of wObj.path) {
    const node = getCellNode(r, c);

    if (node) {
      node.classList.add('found');
      node.classList.remove('selected');
    }
  }

  const chip =
    el.wordList.querySelector(
      `.word-chip[data-word="${word}"]`
    );

  if (chip) {
    chip.classList.add('found');
  }

  const bonus = computeBonus();

  state.score += 100 + bonus;
  state.bonusEarned += bonus;

  sounds.found();

  updateHUD();

  if (
    state.foundCount === state.words.length
  ) {
    winGame();
  }
}

function computeBonus() {
  const ratio =
    state.timeLeft / state.totalTime;

  return Math.round(ratio * 100);
}

function applyError() {
  state.score =
    Math.max(0, state.score - 10);

  sounds.error();

  updateHUD();

  const selected =
    [...state.selectedCells];

  for (const { r, c } of selected) {
    const node = getCellNode(r, c);

    if (
      node &&
      !node.classList.contains('found')
    ) {
      node.classList.add('error');
    }
  }

  setTimeout(() => {
    for (const { r, c } of selected) {
      const node = getCellNode(r, c);

      if (
        node &&
        node.classList.contains('error')
      ) {
        node.classList.remove('error');
      }
    }
  }, 350);
}

let timerId = null;

function startTimer() {
  stopTimer();

  timerId = setInterval(() => {
    if (
      !state.running ||
      state.paused ||
      state.over
    ) {
      return;
    }

    state.timeLeft--;

    updateHUD();

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      gameOver();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function startGame() {
  stopTimer();

  state.paused = false;
  state.over = false;
  state.won = false;
  state.score = 0;
  state.foundCount = 0;
  state.bonusEarned = 0;

  state.timeLeft =
    LEVELS[state.level].time;

  state.totalTime =
    state.timeLeft;

  state.words = [];
  state.pendingWords = [];
  state.selecting = false;
  state.selectedCells = [];
  state.running = true;

  generateBoard(
    state.level,
    state.category
  );

  renderGrid();
  renderWordList();
  updateHUD();

  el.screenMenu.classList.remove('active');
  el.screenGame.classList.add('active');

  hideAllOverlays();

  startTimer();
}

function restartGame() {
  startGame();
}

function pauseGame() {
  if (
    !state.running ||
    state.over ||
    state.won
  ) {
    return;
  }

  state.paused = true;
  state.selecting = false;

  clearSelection();

  el.overlayPause.classList.add('active');
}

function resumeGame() {
  state.paused = false;

  el.overlayPause.classList.remove('active');
}

function winGame() {
  state.running = false;
  state.won = true;
  state.over = true;

  stopTimer();

  state.score += 500;

  sounds.victory();

  updateHUD();

  const timeUsed =
    state.totalTime - state.timeLeft;

  el.victoryScore.textContent =
    state.score;

  el.victoryTime.textContent =
    formatTime(timeUsed);

  el.victoryFound.textContent =
    `${state.foundCount}/${state.words.length}`;

  progress.gamesCompleted++;

  if (state.score > progress.bestScore) {
    progress.bestScore = state.score;
  }

  if (
    progress.bestTime == null ||
    timeUsed < progress.bestTime
  ) {
    progress.bestTime = timeUsed;
  }

  const idx =
    LEVEL_ORDER.indexOf(state.level);

  if (
    idx >= 0 &&
    idx < LEVEL_ORDER.length - 1
  ) {
    const nextKey =
      LEVEL_ORDER[idx + 1];

    if (
      LEVEL_ORDER.indexOf(
        progress.unlockedLevel
      ) < idx + 1
    ) {
      progress.unlockedLevel = nextKey;
    }

    el.btnNext.style.display = 'block';
  } else {
    el.btnNext.style.display = 'none';
  }

  saveProgress();
  updateStatsUI();

  el.overlayVictory.classList.add('active');
}

function gameOver() {
  state.running = false;
  state.over = true;
  state.won = false;
  state.selecting = false;

  clearSelection();

  stopTimer();

  sounds.defeat();

  updateHUD();

  el.overScore.textContent =
    state.score;

  el.overFound.textContent =
    `${state.foundCount}/${state.words.length}`;

  el.overlayGameOver.classList.add('active');
}

function nextLevel() {
  const idx =
    LEVEL_ORDER.indexOf(state.level);

  if (idx < LEVEL_ORDER.length - 1) {
    state.level =
      LEVEL_ORDER[idx + 1];
  }

  startGame();
}

function goToMenu() {
  stopTimer();

  state.running = false;
  state.paused = false;
  state.selecting = false;

  clearSelection();

  hideAllOverlays();

  el.screenGame.classList.remove('active');
  el.screenMenu.classList.add('active');

  renderLevelButtons();
  updateStatsUI();
}

function hideAllOverlays() {
  el.overlayPause.classList.remove('active');
  el.overlayVictory.classList.remove('active');
  el.overlayGameOver.classList.remove('active');
  el.overlayNeedSelection.classList.remove('active');
}

function setSound(on) {
  state.soundOn = on;

  el.btnSoundMenu.textContent =
    on ? '🔊 Sonido: ON' : '🔇 Sonido: OFF';

  el.btnSoundGame.textContent =
    on ? '🔊' : '🔇';

  if (on) {
    initAudio();
  }
}

function toggleSound() {
  setSound(!state.soundOn);
}

function renderCategoryButtons() {
  el.categoryButtons.innerHTML = '';

  for (const key of Object.keys(CATEGORIES)) {
    const b = document.createElement('button');

    b.className =
      'btn choice' +
      (state.category === key
        ? ' selected'
        : '');

    b.textContent =
      CATEGORIES[key].name;

    b.addEventListener('click', () => {
      state.category = key;
      renderCategoryButtons();
    });

    el.categoryButtons.appendChild(b);
  }
}

function renderLevelButtons() {
  el.levelButtons.innerHTML = '';

  for (const key of LEVEL_ORDER) {
    const unlocked =
      LEVEL_ORDER.indexOf(key) <=
      LEVEL_ORDER.indexOf(
        progress.unlockedLevel
      );

    const b =
      document.createElement('button');

    b.className =
      'btn choice' +
      (state.level === key
        ? ' selected'
        : '');

    const lvl = LEVELS[key];

    b.textContent =
      `${
        key === 'facil'
          ? '🌱'
          : key === 'medio'
            ? '⚡'
            : '🔥'
      } ${lvl.name} (${lvl.size}×${lvl.size})`;

    b.title =
      `${lvl.words} palabras · ${
        Math.round(lvl.time / 60)
      } min`;

    if (!unlocked) {
      b.classList.add('locked');
      b.disabled = true;
      b.textContent = '🔒 Bloqueado';
    }

    b.addEventListener('click', () => {
      state.level = key;
      renderLevelButtons();
    });

    el.levelButtons.appendChild(b);
  }
}

function bindUI() {
  el.btnStart.addEventListener('click', () => {
    if (!state.category || !state.level) {
      el.overlayNeedSelection.classList.add('active');
      return;
    }

    startGame();
  });

  el.btnOkNeedSelection.addEventListener(
    'click',
    () =>
      el.overlayNeedSelection.classList.remove(
        'active'
      )
  );

  el.btnNewGame.addEventListener(
    'click',
    goToMenu
  );

  el.btnRestart.addEventListener(
    'click',
    restartGame
  );

  el.btnPause.addEventListener(
    'click',
    pauseGame
  );

  el.btnResume.addEventListener(
    'click',
    resumeGame
  );

  el.btnRestartPause.addEventListener(
    'click',
    () => {
      el.overlayPause.classList.remove(
        'active'
      );

      restartGame();
    }
  );

  el.btnMenuPause.addEventListener(
    'click',
    goToMenu
  );

  el.btnAgain.addEventListener(
    'click',
    () => {
      el.overlayVictory.classList.remove(
        'active'
      );

      startGame();
    }
  );

  el.btnNext.addEventListener(
    'click',
    nextLevel
  );

  el.btnNewGameOver.addEventListener(
    'click',
    () => {
      el.overlayGameOver.classList.remove(
        'active'
      );

      goToMenu();
    }
  );

  el.btnSoundMenu.addEventListener(
    'click',
    toggleSound
  );

  el.btnSoundGame.addEventListener(
    'click',
    toggleSound
  );
}

function init() {
  bindUI();
  renderCategoryButtons();
  renderLevelButtons();
  setSound(true);
  updateStatsUI();
}

document.addEventListener(
  'DOMContentLoaded',
  init
);
