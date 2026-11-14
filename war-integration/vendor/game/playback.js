/** Time follows wall-clock elapsed time; frame density never changes battle speed. */
export class BattleClock {
  constructor() { this.reset(0); }
  reset(duration) { this.duration = duration; this.seconds = 0; this.speed = 1; this.running = false; this.previous = null; }
  play(now) { this.running = this.seconds < this.duration; this.previous = now; }
  pause(now) { if (this.running) this.advance(now); this.running = false; this.previous = null; }
  setSpeed(speed, now) {
    if (![1, 2, 3, 4].includes(speed)) throw new RangeError("Velocidade inválida");
    if (this.running) this.advance(now);
    this.speed = speed; this.previous = this.running ? now : null;
  }
  advance(now) {
    if (this.running && this.previous !== null) {
      this.seconds = Math.min(this.duration, this.seconds + Math.max(0, now - this.previous) / 1000 * this.speed);
      if (this.seconds >= this.duration) this.running = false;
    }
    this.previous = this.running ? now : null;
    return this.seconds;
  }
}

export function frameIndexAt(frames, tick) {
  let low = 0, high = frames.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (frames[middle].tick <= tick) low = middle; else high = middle - 1;
  }
  return low;
}
