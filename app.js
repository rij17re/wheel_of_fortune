const PAGE_PIN_HASH = "f1ee529ef49111208f1c1646c53c8c311c9f093fd7891c1b46d77e98210b018d";

const DEFAULT_PRIZES = [
  { id: 1, name: "15% Jubiläums-Rabatt", initialCount: 10, count: 10 },
  { id: 2, name: "Hauptgewinn", initialCount: 3, count: 3 }, // Celltresor, Retinolset, Handcreme
  { id: 3, name: "Vliesmaske", initialCount: 10, count: 10 },
  { id: 4, name: "Hand/ Fußcreme", initialCount: 40, count: 40 }, // Bähr
  { id: 5, name: "Studio-Accessoires", initialCount: 22, count: 22 }, // 7x Tasche, 10x Schwamm, 5x Stirnband 
  { id: 6, name: "Ampulle", initialCount: 16, count: 16 }
];

const COLORS = ["#3b8b8a", "#e8f3f2", "#87bdba", "#f7f5ee", "#5bb3b1", "#d9e8e6"];
const TEXT_COLORS = ["#ffffff", "#224443", "#ffffff", "#384848", "#ffffff", "#224443"];

class PrizeManager {
  constructor() {
    this.prizes = this.loadPrizes();
  }

  loadPrizes() {
    const basePrizes = JSON.parse(JSON.stringify(DEFAULT_PRIZES));
    let savedStock = {};
    try {
      savedStock = JSON.parse(localStorage.getItem('studio_stock') || '{}');
    } catch (e) {
      console.warn("Konnte LocalStorage nicht lesen:", e);
    }
    
    return basePrizes.map(p => {
      if (savedStock[p.id] !== undefined) {
        p.count = savedStock[p.id];
      }
      return p;
    });
  }

  savePrizes() {
    try {
      const stockMap = {};
      this.prizes.forEach(p => stockMap[p.id] = p.count);
      localStorage.setItem('studio_stock', JSON.stringify(stockMap));
    } catch (e) {
      console.warn("Konnte nicht in LocalStorage schreiben:", e);
    }
  }

  getAvailablePrizes() {
    return this.prizes.filter(p => p.count > 0);
  }

  decrementStock(prizeId) {
    const prize = this.prizes.find(p => p.id === prizeId);
    if (prize && prize.count > 0) {
      prize.count--;
      this.savePrizes();
    }
  }

  resetStock() {
    this.prizes.forEach(p => p.count = p.initialCount);
    this.savePrizes();
  }

  updatePrizesFromInput(inputText) {
    const items = inputText.split(',').map((item, index) => {
      const parts = item.split(':');
      const name = parts[0]?.trim() || '';
      const count = parseInt(parts[1]?.trim(), 10) || 10;
      return { id: index + 1, name, initialCount: count, count };
    }).filter(p => p.name.length > 0);

    if (items.length >= 2) {
      this.prizes = items;
      this.savePrizes();
      return true;
    }
    return false;
  }
}

class WheelEngine {
  constructor(prizeManager) {
    this.prizeManager = prizeManager;
  }

  drawWinner() {
    const available = this.prizeManager.getAvailablePrizes();
    if (available.length === 0) return null;

    const totalRemaining = available.reduce((sum, p) => sum + p.count, 0);
    let random = Math.floor(Math.random() * totalRemaining);

    for (const prize of available) {
      if (random < prize.count) {
        this.prizeManager.decrementStock(prize.id);
        return prize;
      }
      random -= prize.count;
    }
  }
}

let prizeManager;
let wheelEngine;
let winnerLog = [];

let canvas, ctx;
let baseSize = 360;
let radius = baseSize / 2;
let currentAngle = 0;
let isSpinning = false;
let selectedPrizeIndex = 0;

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAccess() {
  const inputPin = prompt("Bitte PIN eingeben, um das Glücksrad zu starten:");
  if (!inputPin) {
    denyAccess();
    return false;
  }

  const hashedInput = await sha256(inputPin);
  if (hashedInput !== PAGE_PIN_HASH) {
    alert("Falsche PIN!");
    denyAccess();
    return false;
  }
  return true;
}

function denyAccess() {
  document.body.innerHTML = "<div style='text-align:center; padding: 50px;'><h2>Zugriff verweigert</h2><p>Bitte Seite neu laden und richtige PIN eingeben.</p></div>";
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  baseSize = Math.min(rect.width, rect.height) || 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(baseSize * dpr);
  canvas.height = Math.round(baseSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  radius = baseSize / 2;
  drawWheel();
}

function drawWheel() {
  if (!ctx || !prizeManager) return;
  const prizes = prizeManager.prizes;
  if (!prizes || prizes.length === 0) return;

  const arcSize = (2 * Math.PI) / prizes.length;
  ctx.clearRect(0, 0, baseSize, baseSize);

  for (let i = 0; i < prizes.length; i++) {
    const angle = currentAngle + i * arcSize;
    ctx.beginPath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, angle, angle + arcSize);
    ctx.lineTo(radius, radius);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = TEXT_COLORS[i % TEXT_COLORS.length];
    
    const fontSize = Math.max(9, Math.min(18, baseSize * 0.04));
    ctx.font = `600 ${fontSize}px 'Montserrat', sans-serif`;
    ctx.fillText(prizes[i].name, radius - baseSize * 0.055, 5);
    ctx.restore();
  }
}

function spin() {
  if (isSpinning) return;

  const winner = wheelEngine.drawWinner();
  if (!winner) {
    alert("Alle Gewinne sind bereits ausverkauft!");
    return;
  }

  selectedPrizeIndex = prizeManager.prizes.findIndex(p => p.id === winner.id);
  isSpinning = true;
  document.getElementById("spinBtn").disabled = true;

  const arcSize = (2 * Math.PI) / prizeManager.prizes.length;
  const pointerAngle = 1.5 * Math.PI;
  const targetSegmentAngle = pointerAngle - (selectedPrizeIndex * arcSize + arcSize / 2);

  const fullSpins = Math.PI * 2 * 6;
  const currentModulo = currentAngle % (Math.PI * 2);
  const targetAngle = currentAngle + fullSpins + (targetSegmentAngle - currentModulo);

  const duration = 4500;
  const startAngle = currentAngle;
  const start = performance.now();

  function animate(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3.5);

    currentAngle = startAngle + (targetAngle - startAngle) * easeOut;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      document.getElementById("spinBtn").disabled = false;

      winnerLog.push({ name: winner.name, date: new Date().toLocaleString('de-DE') });
      try {
        localStorage.setItem('studio_winner_log', JSON.stringify(winnerLog));
      } catch(e) {}

      renderInventoryUI();
      renderWinnerLog();
      showWinner(winner.name);
    }
  }

  requestAnimationFrame(animate);
}

function showWinner(name) {
  document.getElementById("winnerMessage").innerText = name;
  document.getElementById("resultModal").style.display = "flex";
}

function renderInventoryUI() {
  const container = document.getElementById('inventoryList');
  if (!container || !prizeManager) return;
  container.innerHTML = prizeManager.prizes.map(p => `
    <div class="inventory-item ${p.count === 0 ? 'empty' : ''}">
      <span>${p.name}</span>
      <strong>${p.count} / ${p.initialCount}</strong>
    </div>
  `).join('');
}

function renderWinnerLog() {
  const container = document.getElementById('winnerLogList');
  if (!container) return;
  container.innerHTML = winnerLog.length === 0 
    ? '<small style="color:#a0aec0">Noch keine Gewinne verzeichnet.</small>' 
    : winnerLog.map(e => `<div class="log-card"><span>✨ ${e.name}</span><small>${e.date}</small></div>`).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const granted = await verifyAccess();
  if (!granted) return;

  prizeManager = new PrizeManager();
  wheelEngine = new WheelEngine(prizeManager);
  
  try {
    winnerLog = JSON.parse(localStorage.getItem('studio_winner_log') || '[]');
  } catch(e) {
    winnerLog = [];
  }

  canvas = document.getElementById("wheel");
  if (canvas) {
    ctx = canvas.getContext("2d");
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);

  const prizesInput = document.getElementById('prizesInput');
  if (prizesInput) {
    prizesInput.value = prizeManager.prizes.map(p => `${p.name} : ${p.initialCount}`).join(', ');
  }

  document.getElementById('spinBtn')?.addEventListener('click', spin);
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    document.getElementById("resultModal").style.display = "none";
  });

  const adminPanel = document.getElementById("adminPanel");
  document.getElementById('adminToggleBtn')?.addEventListener('click', () => {
    adminPanel.style.display = adminPanel.style.display === "block" ? "none" : "block";
  });

  document.getElementById('savePrizesBtn')?.addEventListener('click', () => {
    const success = prizeManager.updatePrizesFromInput(prizesInput.value);
    if (success) {
      winnerLog = [];
      localStorage.removeItem('studio_winner_log');
      renderInventoryUI();
      renderWinnerLog();
      drawWheel();
      adminPanel.style.display = "none";
      alert("Gewinne erfolgreich aktualisiert!");
    } else {
      alert("Bitte mindestens 2 Gewinne eingeben.");
    }
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (confirm('Bestand und Logbuch zurücksetzen?')) {
      prizeManager.resetStock();
      winnerLog = [];
      localStorage.removeItem('studio_winner_log');
      renderInventoryUI();
      renderWinnerLog();
      drawWheel();
    }
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (winnerLog.length === 0) return alert('Keine Gewinne im Logbuch vorhanden.');
    let csv = "data:text/csv;charset=utf-8,Gewinn,Datum\n" + winnerLog.map(r => `"${r.name}","${r.date}"`).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `gewinne_export_${Date.now()}.csv`;
    link.click();
  });

  renderInventoryUI();
  renderWinnerLog();
  resizeCanvas();
});
