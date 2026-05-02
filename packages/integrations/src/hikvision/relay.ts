// Tiny ISAPI client for triggering NVR relay outputs (sirens, gate openers,
// strobe lights). Hikvision exposes:
//   PUT /ISAPI/System/IO/outputs/{port}/trigger
//   <IOPortData><outputState>high|low</outputState></IOPortData>
//
// Auth is HTTP Digest by default. We use Basic here; teams that need Digest
// should run the NVR behind a reverse proxy that strips the auth.

export interface RelayClientOpts {
  baseUrl: string;       // http(s)://<nvr>/
  username: string;
  password: string;
}

export class HikRelayClient {
  constructor(private opts: RelayClientOpts) {}

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

  async ptzPreset(channel: number, preset: number): Promise<void> {
    const path = `/ISAPI/PTZCtrl/channels/${channel}/presets/${preset}/goto`;
    const r = await this.authedFetch(path, { method: 'PUT' });
    if (!r.ok) throw new Error(`hik ptz preset failed: ${r.status}`);
  }

  async sendTextOverlay(channel: number, text: string): Promise<void> {
    const path = `/ISAPI/System/Video/inputs/channels/${channel}/overlays/text`;
    const body = `<TextOverlay><enabled>true</enabled><displayText>${escapeXml(text)}</displayText></TextOverlay>`;
    const r = await this.authedFetch(path, { method: 'PUT', body });
    if (!r.ok) throw new Error(`hik overlay failed: ${r.status}`);
  }
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}
