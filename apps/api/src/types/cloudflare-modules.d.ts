// Minimal type surface for the Cloudflare runtime. The full generated definitions
// (wrangler types / @cloudflare/workers-types) conflict with @types/node across the
// Node entrypoints, so the API worker declares exactly what it uses.
// This file must stay a script (no top-level imports/exports) so the module
// declarations stay ambient and the interfaces below stay global.
// The Workflows entrypoint classes are exported by `cloudflare:workers` (current);
// `cloudflare:workflows` is the legacy module name, re-exported for older bundles.
declare module 'cloudflare:workers' {
  export interface WorkflowStepRetry {
    limit?: number
    delay?: string | number
    backoff?: 'constant' | 'linear' | 'exponential'
    timeout?: string | number
  }
  export interface WorkflowStepConfig {
    retries?: WorkflowStepRetry
    timeout?: string | number
  }
  export interface WorkflowStep {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>
    do<T>(name: string, config: WorkflowStepConfig, callback: () => Promise<T>): Promise<T>
    sleep(name: string, duration: string | number): Promise<void>
    sleepUntil(name: string, timestamp: Date | number): Promise<void>
  }
  export interface WorkflowEvent<P> {
    payload: P
    timestamp: Date
    instanceId: string
  }
  export type WorkflowContext = object
  export abstract class WorkflowEntrypoint<Env, Params> {
    readonly context: WorkflowContext
    readonly env: Env
    constructor(ctx: WorkflowContext, env: Env)
    abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<unknown>
  }
  export interface WorkflowInstance {
    id: string
  }
  export interface Workflow {
    create(options?: { id?: string; params?: unknown }): Promise<WorkflowInstance>
  }
}

declare module 'cloudflare:workflows' {
  export * from 'cloudflare:workers'
}

declare module 'cloudflare:node' {
  // Binds a Node.js http server (already listening on `port`) to the Worker's fetch event.
  export function httpServerHandler(options: { port: number }): unknown
}

interface ExportedHandler<Env = unknown> {
  fetch?(request: Request, env: Env, ctx: unknown): Response | Promise<Response>
  scheduled?(
    controller: { cron: string; scheduledTime: number },
    env: Env,
    ctx: unknown,
  ): Promise<void> | void
}

interface ScheduledController {
  cron: string
  scheduledTime: number
}
