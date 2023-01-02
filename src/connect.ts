import { getPublicKey, Event, nip04 } from 'nostr-tools';
import { isValidRequest, NostrRPC } from './rpc';
import EventEmitter from 'events';

export interface Metadata {
  name: string;
  url: string;
  description?: string;
  icons?: string[];
}

export enum SessionStatus {
  Paired = 'paired',
  Unpaired = 'unpaired',
}

export class ConnectURI {
  status: SessionStatus = SessionStatus.Unpaired;
  target: string;
  metadata: Metadata;
  relayURL: string;

  static fromURI(uri: string): ConnectURI {
    const url = new URL(uri);
    const target = url.searchParams.get('target');
    if (!target) {
      throw new Error('Invalid connect URI: missing target');
    }
    const relay = url.searchParams.get('relay');
    if (!relay) {
      throw new Error('Invalid connect URI: missing relay');
    }
    const metadata = url.searchParams.get('metadata');
    if (!metadata) {
      throw new Error('Invalid connect URI: missing metadata');
    }

    try {
      const md = JSON.parse(metadata);
      return new ConnectURI({ target: target, metadata: md, relayURL: relay });
    } catch (ignore) {
      throw new Error('Invalid connect URI: metadata is not valid JSON');
    }
  }

  constructor({
    target,
    metadata,
    relayURL,
  }: {
    target: string;
    metadata: Metadata;
    relayURL: string;
  }) {
    this.target = target;
    this.metadata = metadata;
    this.relayURL = relayURL;
  }

  toString() {
    return `nostr://connect?target=${this.target}&metadata=${JSON.stringify(
      this.metadata
    )}&relay=${this.relayURL}`;
  }

  async approve(secretKey: string): Promise<void> {
    const rpc = new NostrRPC({
      relay: this.relayURL,
      secretKey,
    });
    const response = await rpc.call({
      target: this.target,
      request: {
        method: 'connect',
        params: [getPublicKey(secretKey)],
      },
    });
    if (!response) throw new Error('Invalid response from remote');

    return;
  }

  async reject(secretKey: string): Promise<void> {
    const rpc = new NostrRPC({
      relay: this.relayURL,
      secretKey,
    });
    const response = await rpc.call({
      target: this.target,
      request: {
        method: 'disconnect',
        params: [],
      },
    });
    if (!response) throw new Error('Invalid response from remote');

    return;
  }
}

export enum ConnectStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export class Connect {
  rpc: NostrRPC;
  target?: string;
  events = new EventEmitter();
  status = ConnectStatus.Disconnected;

  constructor({
    target,
    relay,
    secretKey,
  }: {
    secretKey: string;
    target?: string;
    relay?: string;
  }) {
    this.rpc = new NostrRPC({ relay, secretKey });
    if (target) {
      this.target = target;
      this.status = ConnectStatus.Connected;
    }
  }

  async init() {
    const sub = await this.rpc.listen();
    sub.on('event', async (event: Event) => {
      let payload;
      try {
        const plaintext = await nip04.decrypt(
          this.rpc.self.secret,
          event.pubkey,
          event.content
        );
        if (!plaintext) throw new Error('failed to decrypt event');
        payload = JSON.parse(plaintext);
      } catch (ignore) {
        return;
      }
      // ignore all the events that are not NostrRPCRequest events
      if (!isValidRequest(payload)) return;

      // ignore all the request that are not connect
      if (payload.method !== 'connect') return;

      // ignore all the request that are not for us
      if (!payload.params || payload.params.length !== 1) return;
      const [pubkey] = payload.params;

      this.status = ConnectStatus.Connected;
      this.target = pubkey;
      this.events.emit('connect', pubkey);
    });
  }

  on(evt: 'connect' | 'disconnect', cb: (...args: any[]) => void) {
    this.events.on(evt, cb);
  }
  off(evt: 'connect' | 'disconnect', cb: (...args: any[]) => void) {
    this.events.off(evt, cb);
  }

  private isConnected() {
    return this.status === ConnectStatus.Connected;
  }

  async getPublicKey(): Promise<string> {
    if (!this.target || !this.isConnected()) throw new Error('Not connected');

    const response = await this.rpc.call({
      target: this.target,
      request: {
        method: 'get_public_key',
        params: [],
      },
    });
    return response as string;
  }

  async signEvent(_event: Event): Promise<Event> {
    throw new Error('Not implemented');
  }

  async getRelays(): Promise<{
    [url: string]: { read: boolean; write: boolean };
  }> {
    throw new Error('Not implemented');
  }

  nip04 = {
    encrypt: async (_pubkey: string, _plaintext: string): Promise<string> => {
      throw new Error('Not implemented');
    },
    decrypt: async (_pubkey: string, _ciphertext: string): Promise<string> => {
      throw new Error('Not implemented');
    },
  };
}
