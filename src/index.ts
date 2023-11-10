interface OperationStatsInput {
  count: number;
  duration: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface OperationEntry extends OperationStatsInput {
  before?: number;
  after?: number;
}

export interface OperationStats extends OperationStatsInput {
  durationAvg: number;
}

export type TimeUnit = 's' | 'ms' | 'us' | 'ns';

const unitFactors: Record<TimeUnit, number> = {
  s: 1e9,
  ms: 1e6,
  us: 1e3,
  ns: 1
};

function timeNanos() {
  const [s, ns] = process.hrtime();

  return (s * 1e9 + ns);
}

export class TimerStats {
  private readonly t0 = timeNanos();

  private entries: Record<string, OperationEntry> = {};
  private previousEntry?: OperationEntry;

  private entry(id: string) {
    return this.entries[id] || (this.entries[id] = {count: 0, duration: 0});
  }

  private addExecution(entry: OperationEntry, after = this.time(), sincePreviousStop = false) {
    let before: number;

    if (sincePreviousStop) {
      // add the duration since the previous call to stop (for any operation), or since creation
      before = this.previousEntry?.after || 0;
    } else {
      // If this operation is already stopped, we only add the duration since the last stop,
      // otherwise we add the duration since it was started (or, if it was never started, since creation)
      before = entry.after || entry.before || 0;
    }

    const duration = after - before;

    entry.before = before;
    entry.after = after;
    entry.duration += duration;

    if (entry.minDuration == null || duration < entry.minDuration) {
      entry.minDuration = duration;
    }
    if (entry.maxDuration == null || duration > entry.maxDuration) {
      entry.maxDuration = duration;
    }

    entry.count++;
  }

  private createStats(entry: OperationEntry, factor: number): OperationStats {
    const {count, duration, minDuration, maxDuration} = entry;

    return {
      count,
      duration: duration / factor,
      minDuration: minDuration != null ? minDuration / factor : undefined,
      maxDuration: maxDuration != null ? maxDuration / factor : undefined,
      durationAvg: duration / count / factor
    };
  }

  time() {
    return timeNanos() - this.t0;
  }

  start(id: string): this {
    const now = this.time();
    const entry = this.entry(id);

    entry.before = now;
    delete entry.after;

    return this;
  }

  stop(id: string, sincePreviousStop = false): this {
    const now = this.time();
    const entry = this.entry(id);

    this.addExecution(entry, now, sincePreviousStop);
    this.previousEntry = entry;

    return this;
  }

  reset(id?: string): this {
    if (id) {
      delete this.entries[id];
    } else {
      this.entries = {};
    }
    return this;
  }

  stats(unit: TimeUnit = 'ms'): Partial<Record<string, OperationStats>> {
    const total = this.entry('total');

    if (!total.duration) {
      this.addExecution(total);
    }

    const factor = unitFactors[unit];

    return Object.fromEntries(
        Object.entries(this.entries)
            .map(([k, v]) => [k, this.createStats(v, factor)]));
  }
}

