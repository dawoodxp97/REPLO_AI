export interface Config {
  port: number
  databaseUrl: string
  currency: string
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 4100),
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://localhost/commerce',
    currency: process.env.CURRENCY ?? 'EUR',
  }
}
