import {
  relayInit,
  Relay,
  getEventHash,
  signEvent,
  validateEvent,
  verifySignature,
  getPublicKey,
  nip04,
  Event,
  Sub,
} from 'nostr-tools';

export interface NostrRPCRequest {
  id: string;
  method: string;
  params: any[];
}
export interface NostrRPCResponse {
  id: string;
  result: any;
  error: any;
}

export class NostrRPC {
  relay: Relay;
  self: { pubkey: string; secret: string };
  // this is for implementing the response handlers for each method
  [key: string]: any;

  constructor(opts: { relay?: string; secretKey: string }) {
    this.relay = relayInit(opts.relay || 'wss://nostr.vulpem.com');
    this.self = {
      pubkey: getPublicKey(opts.secretKey),
      secret: opts.secretKey,
    };
  }
  async call({
    target,
    request: { id = randomID(), method, params = [] },
  }: {
    target: string;
    request: {
      id?: string;
      method: string;
      params?: any[];
    };
  }): Promise<any> {
    // connect to relay
    await this.relay.connect();
    this.relay.on('error', () => {
      throw new Error(`failed to connect to ${this.relay.url}`);
    });

    // prepare request to be sent
    const body = prepareRequest(id, method, params);
    const event = await prepareEvent(this.self.secret, target, body);

    // send request via relay
    await new Promise<void>((resolve, reject) => {
      const pub = this.relay.publish(event);
      pub.on('failed', reject);
      pub.on('seen', resolve);
    });

    console.log(`request: nostr id: ${event.id}`, { id, method, params });

    return new Promise<void>((resolve, reject) => {
      // waiting for response from remote
      const queries = [
        {
          kinds: [4],
          authors: [target],
          '#p': [this.self.pubkey],
        },
      ];
      // TODO: reject after a timeout
      let sub = this.relay.sub(queries);

      console.log('subscribing to', JSON.stringify(queries));

      sub.on('event', async (event: Event) => {
        let payload;
        try {
          const plaintext = await nip04.decrypt(
            this.self.secret,
            event.pubkey,
            event.content
          );
          if (!plaintext) throw new Error('failed to decrypt event');
          payload = JSON.parse(plaintext);
        } catch (ignore) {
          return;
        }

        // ignore all the events that are not NostrRPCResponse events
        if (!isValidResponse(payload)) return;
        console.log(`response: nostr id: ${event.id}`, payload);

        // ignore all the events that are not for this request
        if (payload.id !== id) return;

        // if the response is an error, reject the promise
        if (payload.error) {
          reject(payload.error);
        }

        // if the response is a result, resolve the promise
        if (payload.result) {
          resolve(payload.result);
        }
      });

      sub.on('eose', () => {
        sub.unsub();
      });
    });
  }

  async listen(): Promise<Sub> {
    await this.relay.connect();
    await new Promise<void>((resolve, reject) => {
      this.relay.on('connect', resolve);
      this.relay.on('error', reject);
    });

    let sub = this.relay.sub([
      {
        kinds: [4],
        '#p': [this.self.pubkey],
        since: now(),
      },
    ]);

    sub.on('event', async (event: Event) => {
      let payload;
      try {
        const plaintext = await nip04.decrypt(
          this.self.secret,
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

      // handle request
      const response = await this.handleRequest(payload);
      const body = prepareResponse(
        response.id,
        response.result,
        response.error
      );
      const responseEvent = await prepareEvent(
        this.self.secret,
        event.pubkey,
        body
      );

      console.log('response to be sent', responseEvent);
      // send response via relay
      const pub = this.relay.publish(responseEvent);
      pub.on('failed', console.error);
    });

    sub.on('eose', () => {
      sub.unsub();
    });

    return sub;
  }

  private async handleRequest(
    request: NostrRPCRequest
  ): Promise<NostrRPCResponse> {
    const { id, method, params } = request;
    let result = null;
    let error = null;
    try {
      result = await this[method](...params);
    } catch (e) {
      if (e instanceof Error) {
        error = e.message;
      } else {
        error = 'unknown error';
      }
    }
    return {
      id,
      result,
      error,
    };
  }
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
export function randomID(): string {
  return Math.random()
    .toString()
    .slice(2);
}
export function prepareRequest(
  id: string,
  method: string,
  params: any[]
): string {
  return JSON.stringify({
    id,
    method: method,
    params: params,
  });
}
export function prepareResponse(id: string, result: any, error: any): string {
  return JSON.stringify({
    id: id,
    result: result,
    error: error,
  });
}
export async function prepareEvent(
  secretKey: string,
  pubkey: string,
  content: string
): Promise<Event> {
  const cipherText = await nip04.encrypt(secretKey, pubkey, content);

  const event: Event = {
    kind: 4,
    created_at: now(),
    pubkey: getPublicKey(secretKey),
    tags: [['p', pubkey]],
    content: cipherText,
  };

  const id = getEventHash(event);
  const sig = signEvent(event, secretKey);

  const signedEvent = { ...event, id, sig };
  let ok = validateEvent(signedEvent);
  let veryOk = verifySignature(signedEvent);
  if (!ok || !veryOk) {
    throw new Error('Event is not valid');
  }

  return signedEvent;
}

function isValidRequest(payload: any): boolean {
  if (!payload) return false;

  const keys = Object.keys(payload);
  if (
    !keys.includes('id') ||
    !keys.includes('method') ||
    !keys.includes('params')
  )
    return false;

  return true;
}

function isValidResponse(payload: any): boolean {
  if (!payload) return false;

  const keys = Object.keys(payload);
  if (
    !keys.includes('id') ||
    !keys.includes('result') ||
    !keys.includes('error')
  )
    return false;

  return true;
}
