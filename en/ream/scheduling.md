# Task Scheduling

Ream runs recurring work from a Rust ticker: TypeScript declares *what* runs
and *when*, the loop itself lives in the Rust core, and no `setInterval` is
involved.

## Declaring a task

Decorate a method of a registered service with `@Schedule` and a standard
5-field cron expression (minute, hour, day-of-month, month, day-of-week):

```ts
import { Schedule, Service } from '@c9up/ream'

@Service()
export class Invoices {
  @Schedule('0 3 * * *')
  async issueDaily() {
    // ...
  }
}
```

Expressions are evaluated in **UTC**. A task that has to fire at a local hour
must have that translated before it reaches the decorator.

`ScheduleProvider` discovers the decorated methods by walking the IoC service
registry — twice: once when providers boot, and once at start, after
`app/modules/**` has been auto-loaded. A task declared in a module is found by
the second pass, and a task found by the first is not registered again.

The service is resolved **at invocation time**, not at registration time, so
every run receives freshly injected dependencies.

Static methods, getters and setters are rejected when the decorator runs, not
at first fire.

## Running on more than one instance

By default the scheduler locks nothing. On one instance that is correct. On
two, both fire the same task on the same tick — the daily invoice run goes out
twice, the reminder email arrives twice, and nothing in the logs says so.

`config/scheduler.ts` names the lock that closes that:

```ts
import { defineConfig, locks } from '@c9up/ream/scheduler/config'

export default defineConfig({
  lock: locks.redis({ connection: 'main' }),
})
```

Before firing a task, every instance asks the lock for the task's name; exactly
one gets it, and the others skip that tick — emitting
`schedule.task.skipped` with reason `locked`. The lease is released as soon as
the task returns, so the next tick is free again.

### The backends

| Factory | Reach |
| --- | --- |
| `locks.memory()` | This process only. Two processes each keep their own map, so it bounds nothing across replicas. |
| `locks.redis({ connection })` | Every instance pointed at the same Redis. |

`connection` takes the name of a [`@c9up/quasar`](/en/modules/quasar)
connection — resolved when the first task fires, not while the config file is
read — or any client answering `set` and `eval`.

`prefix` renames the key namespace (default `ream:schedule:lock:`).

### The lease

```ts
export default defineConfig({
  lock: locks.redis({ connection: 'main' }),
  defaultLockTtlMs: 60_000,
})
```

A lease expires on its own after `defaultLockTtlMs` (one minute by default).
That expiry is what recovers the lock from a crash: an instance that dies
holding it never releases, and the name frees itself.

Set it above the longest a task can legitimately run. If a task outlives its
lease, another instance acquires the name and starts running alongside it —
the first one's release is then a no-op, because the lock verifies the lease
is still its own before dropping it.

## From the command line

```bash
ream schedule:list          # every registered task and its next run
ream schedule:run <name>    # run one now
```

`schedule:run` is an explicit operator action: it bypasses the lock, and runs
even on an instance that would have skipped the tick.

## Observing

The scheduler emits `schedule.task.started`, `schedule.task.completed`,
`schedule.task.failed` and `schedule.task.skipped`. `getStats()` tracks run
counts and durations per task whether or not a sink is wired.
