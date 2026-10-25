export interface RpcReply {
  status?: number
  body: unknown
}

export interface RpcCall {
  path: string
  input: unknown
  headers: Record<string, string>
}

export type RpcHandler = (call: RpcCall) => RpcReply | Promise<RpcReply>

export type RpcHandlers = Record<string, RpcHandler>

export function rpcError(code: string, status: number, data?: unknown): RpcReply {
  return { status, body: { defined: data !== undefined, code, status, message: code, data } }
}
