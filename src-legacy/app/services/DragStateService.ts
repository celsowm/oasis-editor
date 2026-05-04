export class DragStateService {
  private _isDragging = false;
  private _lastDragOverTime = 0;
  private _lastDropTime = 0;
  private _dragEnterCounter = 0;

  get isDragging(): boolean {
    return this._isDragging;
  }

  set isDragging(value: boolean) {
    this._isDragging = value;
  }

  get lastDragOverTime(): number {
    return this._lastDragOverTime;
  }

  set lastDragOverTime(value: number) {
    this._lastDragOverTime = value;
  }

  get lastDropTime(): number {
    return this._lastDropTime;
  }

  set lastDropTime(value: number) {
    this._lastDropTime = value;
  }

  enter(): void {
    this._dragEnterCounter++;
    this._isDragging = true;
  }

  leave(): void {
    this._dragEnterCounter--;
    if (this._dragEnterCounter <= 0) {
      this._dragEnterCounter = 0;
      this._isDragging = false;
    }
  }

  reset(): void {
    this._dragEnterCounter = 0;
    this._isDragging = false;
  }

  shouldThrottleDragOver(now: number, thresholdMs = 50): boolean {
    if (now - this._lastDragOverTime < thresholdMs) {
      return true;
    }
    this._lastDragOverTime = now;
    return false;
  }

  recordDrop(): void {
    this._lastDropTime = Date.now();
    this.reset();
  }
}
