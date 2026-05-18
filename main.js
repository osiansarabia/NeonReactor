const GAME_SECONDS = 45;
const BEST_KEY = "neonReactorBest";
const MIN_TARGET_SIZE = 36;
const MAX_TARGET_SIZE = 78;

const arena = document.querySelector("#arena");
const message = document.querySelector("#message");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const timeEl = document.querySelector("#time");
const bestEl = document.querySelector("#best");
const startButton = document.querySelector("#start");
const muteButton = document.querySelector("#mute");
const overlay = document.querySelector("#game-over");
const finalScoreEl = document.querySelector("#final-score");
const finalBestEl = document.querySelector("#final-best");
const restartButton = document.querySelector("#restart");

let score = 0;
let combo = 1;
let timeLeft = GAME_SECONDS;
let best = Number(localStorage.getItem(BEST_KEY)) || 0;
let running = false;
let muted = false;
let ticker = null;
let spawnTimer = null;
let audioContext = null;

function render() {
  scoreEl.textContent = score;
  comboEl.textContent = combo;
  timeEl.textContent = timeLeft;
  bestEl.textContent = best;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playTone(frequency, duration = 0.06) {
  if (muted) {
    return;
  }

  audioContext ||= new AudioContext();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function addPop(text, x, y) {
  const pop = document.createElement("span");
  pop.className = "pop";
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  arena.append(pop);
  pop.addEventListener("animationend", () => pop.remove(), { once: true });
}

function getSpawnDelay() {
  return Math.max(330, 900 - score * 5 - combo * 14);
}

function getTargetLife() {
  return Math.max(620, 1500 - score * 6 - combo * 18);
}

function scheduleSpawn() {
  clearTimeout(spawnTimer);

  if (!running) {
    return;
  }

  spawnTimer = setTimeout(() => {
    spawnTarget();
    scheduleSpawn();
  }, getSpawnDelay());
}

function spawnTarget() {
  const rect = arena.getBoundingClientRect();
  const size = randomBetween(MIN_TARGET_SIZE, MAX_TARGET_SIZE);
  const target = document.createElement("button");
  const isBonus = Math.random() < 0.16;
  const life = getTargetLife();

  target.type = "button";
  target.className = `target${isBonus ? " bonus" : ""}`;
  target.style.setProperty("--size", `${size}px`);
  target.style.setProperty("--life", `${life}ms`);
  target.style.left = `${randomBetween(size, rect.width - size)}px`;
  target.style.top = `${randomBetween(size, rect.height - size)}px`;
  target.setAttribute("aria-label", isBonus ? "Objetivo bonus" : "Objetivo");

  const missTimer = setTimeout(() => {
    target.remove();
    combo = 1;
    timeLeft = Math.max(0, timeLeft - 2);
    addPop("-2s", parseFloat(target.style.left), parseFloat(target.style.top));
    playTone(120, 0.09);
    render();
  }, life);

  target.addEventListener("click", (event) => {
    event.stopPropagation();
    clearTimeout(missTimer);
    target.remove();

    const points = (isBonus ? 10 : 3) * combo;
    score += points;
    combo = Math.min(combo + 1, 25);
    timeLeft += isBonus ? 2 : 0;
    addPop(`+${points}${isBonus ? " +2s" : ""}`, event.offsetX + target.offsetLeft, event.offsetY + target.offsetTop);
    playTone(isBonus ? 720 : 440 + combo * 18);
    render();
  });

  arena.append(target);
}

function clearTargets() {
  arena.querySelectorAll(".target, .pop").forEach((element) => element.remove());
}

function endGame() {
  running = false;
  clearInterval(ticker);
  clearTimeout(spawnTimer);
  clearTargets();

  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  finalScoreEl.textContent = score;
  finalBestEl.textContent = best;
  overlay.classList.remove("hidden");
  startButton.textContent = "Iniciar";
  message.textContent = "Pulsa INICIAR y caza los núcleos antes de que exploten.";
  render();
}

function startGame() {
  score = 0;
  combo = 1;
  timeLeft = GAME_SECONDS;
  running = true;
  overlay.classList.add("hidden");
  message.textContent = "";
  startButton.textContent = "Reiniciar";
  clearTargets();
  render();

  clearInterval(ticker);
  ticker = setInterval(() => {
    timeLeft -= 1;

    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
      return;
    }

    render();
  }, 1000);

  spawnTarget();
  scheduleSpawn();
}

arena.addEventListener("click", () => {
  if (!running) {
    return;
  }

  combo = 1;
  timeLeft = Math.max(0, timeLeft - 1);
  playTone(150, 0.06);
  render();
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.textContent = `Sonido: ${muted ? "OFF" : "ON"}`;
  muteButton.setAttribute("aria-pressed", String(muted));
});

render();
