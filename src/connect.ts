import EventEmitter from 'events';
import { Event, getPublicKey, nip04, Kind } from 'nostr-tools';
import { nip26 } from 'nostr-tools';

import { isValidRequest, NostrRPC } from './rpc';

export interface Metadata {
  name: string;
  url?: string;
  description?: string;
  icons?: string[];
}

export enum TimeRanges {
  FIVE_MINS = '5mins',
  ONE_HR = '1hour',
  ONE_DAY = '1day',
  ONE_WEEK = '1week',
  ONE_MONTH = '1month',
  ONE_YEAR = '1year',
}
export const TimeRangeToUnix: Record<TimeRanges, number> = {
  [TimeRanges.FIVE_MINS]: Math.round(Date.now() / 1000) + 60 * 5,
  [TimeRanges.ONE_HR]: Math.round(Date.now() / 1000) + 60 * 60,
  [TimeRanges.ONE_DAY]: Math.round(Date.now() / 1000) + 60 * 60 * 24,
  [TimeRanges.ONE_WEEK]: Math.round(Date.now() / 1000) + 60 * 60 * 24 * 7,
  [TimeRanges.ONE_MONTH]: Math.round(Date.now() / 1000) + 60 * 60 * 24 * 30,
  [TimeRanges.ONE_YEAR]: Math.round(Date.now() / 1000) + 60 * 60 * 24 * 365,
};

export class ConnectURI {
  target: string;
  metadata: Metadata;
  relay: string;

  static fromURI(uri: string): ConnectURI {
    const url = new URL(uri);
    const target = url.hostname || url.pathname.substring(2);
    if (!target) throw new Error('Invalid connect URI: missing target');
    const relay = url.searchParams.get('relay');
    if (!relay) {
      throw new Error('Invalid connect URI: missing relay');
    }
    const metadata = url.searchParams.get('metadata');
    if (!metadata) {
      throw new Error('Invalid connect URI: missing metadata');
    }

    /* eslint-disable @typescript-eslint/no-unused-vars */
    try {
      const md = JSON.parse(metadata);
      return new ConnectURI({ target, metadata: md, relay });
    } catch (ignore) {
      throw new Error('Invalid connect URI: metadata is not valid JSON');
    }
  }

  constructor({
    target,
    metadata,
    relay,
  }: {
    target: string;
    metadata: Metadata;
    relay: string;
  }) {
    this.target = target;
    this.metadata = metadata;
    this.relay = relay;
  }

  toString() {
    return `nostrconnect://${this.target}?metadata=${encodeURIComponent(
      JSON.stringify(this.metadata)
    )}&relay=${encodeURIComponent(this.relay)}`;
  }

  async approve(secretKey: string): Promise<void> {
    const rpc = new NostrRPC({
      relay: this.relay,
      secretKey,
    });
    await rpc.call(
      {
        target: this.target,
        request: {
          method: 'connect',
          params: [getPublicKey(secretKey)],
        },
      },
      { skipResponse: true }
    );
  }

  async reject(secretKey: string): Promise<void> {
    const rpc = new NostrRPC({
      relay: this.relay,
      secretKey,
    });
    await rpc.call(
      {
        target: this.target,
        request: {
          method: 'disconnect',
          params: [],
        },
      },
      { skipResponse: true }
    );
  }
}

export class Connect {
  rpc: NostrRPC;
  target?: string;
  events = new EventEmitter();

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
    }
  }

  async init() {
    const sub = await this.rpc.listen();
    sub.on('event', async (event: Event) => {
      let payload;
      /* eslint-disable @typescript-eslint/no-unused-vars */
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

      switch (payload.method) {
        case 'connect': {
          if (!payload.params || payload.params.length !== 1)
            throw new Error('connect: missing pubkey');
          const [pubkey] = payload.params;
          this.target = pubkey;
          this.events.emit('connect', pubkey);
          break;
        }
        case 'disconnect': {
          this.target = undefined;
          this.events.emit('disconnect');
          break;
        }
        default:
      }
    });
  }

  on(evt: 'connect' | 'disconnect', cb: (...args: any[]) => void) {
    this.events.on(evt, cb);
  }
  off(evt: 'connect' | 'disconnect', cb: (...args: any[]) => void) {
    this.events.off(evt, cb);
  }

  async disconnect(): Promise<void> {
    if (!this.target) throw new Error('Not connected');

    // notify the UI that we are disconnecting
    this.events.emit('disconnect');

    try {
      await this.rpc.call(
        {
          target: this.target,
          request: {
            method: 'disconnect',
            params: [],
          },
        },
        { skipResponse: true }
      );
    } catch (error) {
      throw new Error('Failed to disconnect');
    }

    this.target = undefined;
  }

  async getPublicKey(): Promise<string> {
    if (!this.target) throw new Error('Not connected');

    const response = await this.rpc.call({
      target: this.target,
      request: {
        method: 'get_public_key',
        params: [],
      },
    });
    return response as string;
  }

  async signEvent(event: {
    kind: Kind;
    tags: string[][];
    pubkey: string;
    content: string;
    created_at: number;
  }): Promise<Event> {
    if (!this.target) throw new Error('Not connected');

    const eventWithSig = await this.rpc.call({
      target: this.target,
      request: {
        method: 'sign_event',
        params: [event],
      },
    });

    return eventWithSig as Event;
  }

  async describe(): Promise<string[]> {
    if (!this.target) throw new Error('Not connected');

    const response = await this.rpc.call({
      target: this.target,
      request: {
        method: 'describe',
        params: [],
      },
    });
    return response as string[];
  }

  async delegate(
    delegatee: string = this.rpc.self.pubkey,
    conditions: {
      kind?: number;
      until?: number | TimeRanges;
      since?: number | TimeRanges;
    }
  ): Promise<nip26.Delegation> {
    if (!this.target) throw new Error('Not connected');

    if (conditions.until && typeof conditions.until !== 'number') {
      if (!Object.keys(TimeRangeToUnix).includes(conditions.until))
        throw new Error(
          'conditions.until must be either a number or a valid TimeRange'
        );
      conditions.until = TimeRangeToUnix[conditions.until];
    }
    if (conditions.since && typeof conditions.since !== 'number') {
      if (!Object.keys(TimeRangeToUnix).includes(conditions.since))
        throw new Error(
          'conditions.since must be either a number or a valid TimeRange'
        );
      conditions.since = TimeRangeToUnix[conditions.since];
    }

    const delegation = await this.rpc.call({
      target: this.target,
      request: {
        method: 'delegate',
        params: [delegatee, conditions],
      },
    });
    return delegation as nip26.Delegation;
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
