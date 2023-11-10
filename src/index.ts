export interface OperationEntry {
  count: number;
  before?: number;
  after?: number;
  duration: number;
}

export interface OperationStats {
  count: number;
  duration: number;
  durationAvg: number;
}

export type TimeUnit = 's' | 'ms' | 'us' | 'ns';

const unitFactors: Record<TimeUnit, number> = {
  s: 1e9,
  ms: 1e6,
  us: 1e3,
  ns: 1
};

export class TimerStats<K extends string = never> {
  static time() {
    const [s, ns] = process.hrtime();

    return s * 1e9 + ns;
  }

  private readonly t0 = TimerStats.time();

  private entries: Record<string, OperationEntry> = {};
  private currentEntry?: OperationEntry;


  private entry(id: string) {
    return this.entries[id] || (this.entries[id] = {count: 0, duration: 0});
  }

  private addExecution(entry: OperationEntry, after = TimerStats.time(), sincePreviousStop = false) {
    let before: number;

    if (sincePreviousStop) {
      // add the duration since the previous call to stop (for any operation), or since creation
      before = this.currentEntry?.after || this.t0;
    } else {
      // If this operation is already stopped, we only add the duration since the last stop. Otherwise we add the
      // duration since it was started (or, if it was never started, since creation)
      before = entry.after || entry.before || this.t0;
    }

    entry.before = before;
    entry.after = after;
    entry.duration += after - before;
    entry.count++;
  }

  private createStats(entry: OperationEntry, factor: number): OperationStats {
    const {count, duration} = entry;

    return {
      count,
      duration: duration / factor,
      durationAvg: duration / count / factor
    };
  }

  start(id: string): this {
    const now = TimerStats.time();
    const entry = this.entry(id);

    entry.before = now;
    delete entry.after;

    return this;
  }

  stop<K2 extends string>(id: K2, sincePreviousStop = false): TimerStats<K | K2> {
    const now = TimerStats.time();
    const entry = this.entry(id);

    this.addExecution(entry, now, sincePreviousStop);
    this.currentEntry = entry;

    return this as TimerStats<K | K2>;
  }

  reset<K2 extends K = K>(id?: K2): TimerStats<Exclude<K, K2>> {
    if (id) {
      delete this.entries[id];
    } else {
      this.entries = {};
    }
    return this;
  }

  stats(unit: TimeUnit = 'ms'): Record<K | 'total', OperationStats> {
    const total = this.entry('total');
    if (!total.duration) {
      this.addExecution(total);
    }

    const factor = unitFactors[unit];

    return Object.fromEntries(
        Object.entries(this.entries)
            .map(([k, v]) => [k, this.createStats(v, factor)])) as Record<K | 'total', OperationStats>;
  }
}

