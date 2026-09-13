export class WheelEngine {
  constructor(prizeManager) {
    this.prizeManager = prizeManager;
  }

  // Zieht einen Preis gewichtet nach verbleibender Stückzahl
  drawWinner() {
    const available = this.prizeManager.getAvailablePrizes();
    
    if (available.length === 0) {
      return null; // Ausverkauft
    }

    // Gesamtzahl aller noch verfügbaren Lose/Preise
    const totalRemaining = available.reduce((sum, p) => sum + p.count, 0);
    let random = Math.floor(Math.random() * totalRemaining);

    // Gewinner ermitteln
    for (const prize of available) {
      if (random < prize.count) {
        this.prizeManager.decrementStock(prize.id);
        return prize;
      }
      random -= prize.count;
    }
  }
}