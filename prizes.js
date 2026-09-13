// Standard-Konfiguration, falls noch nichts im localStorage liegt
const DEFAULT_PRIZES = [
  { id: 1, name: "Hauptgewinn", initialCount: 2, count: 2 }, // Celltresor
  { id: 2, name: "Pflegeset Premium", initialCount: 6, count: 6 }, // 5x Cellular, 1x Retinol
  { id: 3, name: "Power-Ampulle", initialCount: 16, count: 16 }, // 16x Ampulle
  { id: 4, name: "VliesMaske", initialCount: 10, count: 10 }, // 10x Maske
  { id: 5, name: "Studio-Accessoire", initialCount: 22, count: 22 }, // 7x Tasche, 10x Schwamm, 5x Stirnband
  { id: 6, name: "Handcreme", initialCount: 16, count: 16 },
  { id: 7, name: "15% Jubiläums-Rabatt", initialCount: 10, count: 10 }
];

export class PrizeManager {
  constructor() {
    this.prizes = this.loadPrizes();
  }

  // Daten aus dem localStorage laden oder Standards setzen
  loadPrizes() {
    const saved = localStorage.getItem('studio_prizes');
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_PRIZES));
  }

  // Aktuellen Stand im localStorage sichern
  savePrizes() {
    localStorage.setItem('studio_prizes', JSON.stringify(this.prizes));
  }

  // Liefert nur Preise zurück, die noch vorrätig sind
  getAvailablePrizes() {
    return this.prizes.filter(p => p.count > 0);
  }

  // Reduziert den Bestand eines Gewinns um 1
  decrementStock(prizeId) {
    const prize = this.prizes.find(p => p.id === prizeId);
    if (prize && prize.count > 0) {
      prize.count--;
      this.savePrizes();
    }
  }

  // Setzt die Inventarzahlen wieder auf den ursprünglichen Startwert zurück
  resetStock() {
    this.prizes.forEach(p => p.count = p.initialCount);
    this.savePrizes();
  }

  // Erlaubt das Verändern der Gewinne über eine Komma-Liste (z.B. "Name:Anzahl")
  updatePrizesFromInput(inputText) {
    const items = inputText.split(',').map((item, index) => {
      const [name, countStr] = item.split(':');
      const count = parseInt(countStr?.trim(), 10) || 1;
      return {
        id: index + 1,
        name: name.trim(),
        initialCount: count,
        count: count
      };
    }).filter(p => p.name.length > 0);

    if (items.length > 0) {
      this.prizes = items;
      this.savePrizes();
    }
  }
}