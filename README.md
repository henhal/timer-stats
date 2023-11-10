# timer-stats
A small and simple zero-dependency Node.JS performance library for easily measuring execution time of code blocks, supporting
measuring an operation multiple times. Offering summarized duration, execution count and min/max/avg statistics.

Nanosecond precision is offered using Node.JS `process.hrtime()`.

## Installation

`$ npm install timer-stats`

or

`$ yarn add timer-stats`

## Usage

Basic usage:
```
const t = new TimerStats();

# Start measuring a new task
t.start('someTask');

# Stop measuring a task
t.stop('someTask');

# Start measuring a new execution of an existing task
t.start('someTask');

# Stop measuring the last execution of a task, summing up the duration of both executions
t.stop('someTask');

# Get statistics (converted to milliseconds)
t.stats('ms');
```

Special usage: 
```
# Log an operation that wasn't explicitly started - will measure the time from when the TimerStats was created
t.stop('foo');

# Log an operation that wasn't explicitly started but which has previous executions - will add the duration from then _this_ task last was stopped
t.stop('foo');

# Log an operation that wasn't explicitly started - will add the duration from when the previous task (_any_ task) stopped
t.stop('bar', true);

# Reset a task
t.reset('foo');

# Reset all tasks
t.reset();
```

### Example
```
import {TimerStats} from 'timer-stats';

const t = new TimerStats();

for (let i = 0; i < 100; i++) {
    t.start('heavyTask');
    await doSomethingHeavy();
    t.stop('heavyTask');
    await doSomeOtherTask();
    t.stop('otherTask');
}

console.log(t.stats());
```

The output is:

```
{
  heavyTask: {
    count: 100,
    duration: 2108.540039,
    minDuration: 19.448958,
    maxDuration: 22.885791,
    durationAvg: 21.08540039
  },
  otherTask: {
    count: 100,
    duration: 2689.798083,
    minDuration: 25.091542,
    maxDuration: 29.638917,
    durationAvg: 26.897980829999998
  },
  total: {
    count: 1,
    duration: 2690.076666,
    minDuration: 2690.076666,
    maxDuration: 2690.076666,
    durationAvg: 2690.076666
  }
}
```