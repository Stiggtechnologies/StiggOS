// Mirror of @stigg/integrations/hikvision relay client for the Deno edge runtime.

export interface RelayOpts { baseUrl: string; username: string; password: string }

export class HikRelay {
  constructor(private opts: RelayOpts) {}

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const auth = btoa(`${this.opts.username}:${this.opts.password}`);
    const url = new URL(path, this.opts.baseUrl).toString();
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        authorization: `Basic ${auth}`,
        'content-type': init.body ? 'application/xml' : 'text/plain',
      },
    });
  }

  async fireRelay(port: number, durationMs = 3000): Promise<void> {
    const path = `/ISAPI/System/IO/outputs/${port}/trigger`;
    const on  = `<IOPortData><outputState>high</outputState></IOPortData>`;
    const off = `<IOPortData><outputState>low</outputState></IOPortData>`;
    const r1 = await this.authedFetch(path, { method: 'PUT', body: on });
    if (!r1.ok) throw new Error(`hik relay HIGH failed: ${r1.status}`);
    await new Promise((res) => setTimeout(res, durationMs));
    const r2 = await this.authedFetch(path, { method: 'PUT', body: off });
    if (!r2.ok) throw new Error(`hik relay LOW failed: ${r2.status}`);
  }
}
