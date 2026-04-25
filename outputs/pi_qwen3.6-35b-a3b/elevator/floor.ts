import { MIN_FLOOR, MAX_FLOOR, TOTAL_FLOORS } from './config.js';

export type FloorRequest = {
  floor: number;
  direction: 'up' | 'down';
  queued: boolean;
};

export class Floor {
  public number: number;
  public upRequests: FloorRequest[] = [];
  public downRequests: FloorRequest[] = [];

  constructor(number: number) {
    if (number < MIN_FLOOR || number > MAX_FLOOR) {
      throw new Error(`Invalid floor number: ${number}`);
    }
    this.number = number;
  }

  requestUp(): FloorRequest {
    const existing = this.upRequests.find(r => !r.queued);
    if (existing) return existing;
    const req: FloorRequest = { floor: this.number, direction: 'up', queued: false };
    this.upRequests.push(req);
    return req;
  }

  requestDown(): FloorRequest {
    const existing = this.downRequests.find(r => !r.queued);
    if (existing) return existing;
    const req: FloorRequest = { floor: this.number, direction: 'down', queued: false };
    this.downRequests.push(req);
    return req;
  }

  cancelRequest(direction: 'up' | 'down'): void {
    const list = direction === 'up' ? this.upRequests : this.downRequests;
    const idx = list.findIndex(r => !r.queued);
    if (idx !== -1) list.splice(idx, 1);
  }

  hasPendingRequests(): boolean {
    return this.upRequests.some(r => !r.queued) || this.downRequests.some(r => !r.queued);
  }

  clearAllRequests(): void {
    this.upRequests = [];
    this.downRequests = [];
  }
}
