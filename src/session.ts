import {
  validateEvent,
  verifySignature,
  signEvent,
  getEventHash,
  Event,
  relayInit,
  nip04,
  getPublicKey,
} from 'nostr-tools'
import { ConnectMessage, ConnectMessageType, PairingACK } from './connect';
import { prepareResponse } from './event';

export interface Metadata {
  name: string,
  url: string,
  description?: string
  icons?: string[],
}

export enum SessionStatus {
  PROPOSED = 'PROPOSED',
  PAIRED = 'PAIRED',
  UNPAIRED = 'UNPAIRED',
}

export class Session {
  metadata: Metadata;
  relay: string;
  target: string;
  remote?: string;
  connectURI: string;
  status: SessionStatus = SessionStatus.PROPOSED;
  listeners: Record<string, { [type: string]: Array<(value: any) => any> }>;

  static fromConnectURI(uri: string): Session {
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
      return new Session({ target: target, metadata: md, relay });
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
    relay: string;
    metadata: Metadata
  }) {
    this.listeners = {};
    this.target = target;
    this.metadata = metadata;
    this.relay = relay;
    this.connectURI = `nostr://connect?target=${this.target}&metadata=${JSON.stringify(this.metadata)}&relay=${this.relay}`;
  }

  on(
    type: ConnectMessageType,
    cb: (value: any) => any
  ): void {
    const id = Math.random().toString().slice(2);
    this.listeners[id] = this.listeners[id] || emptyListeners();
    this.listeners[id][type].push(cb);
  }

  off(type: ConnectMessageType, cb: (value: any) => any): void {
    for (const id in this.listeners) {
      const idx = this.listeners[id][type].indexOf(cb);
      if (idx > -1) {
        this.listeners[id][type].splice(idx, 1);
      }
    }
  }

  // this is used to process messages to the given key and emit to listeners
  async listen(secretKey: string): Promise<void> {
    if (!secretKey) throw new Error('secret key is required');
    const pubkey = getPublicKey(secretKey);



    const relay = relayInit(this.relay);
    await relay.connect();
    relay.on('connect', () => { console.log(`connected to ${relay.url}`) });
    relay.on('error', () => { console.error(`failed to connect to ${relay.url}`) });

    let sub = relay.sub([{
      kinds: [4],
      "#p": [pubkey],
    }]);
    sub.on('event', async (event: Event) => {
      const plaintext = await nip04.decrypt(secretKey, event.pubkey, event.content);
      const payload = JSON.parse(plaintext);
      if (!payload) return;
      if (!Object.keys(payload).includes('requestID') || !Object.keys(payload).includes('message')) return;

      const msg = payload.message as ConnectMessage;

      switch (msg.type) {
        case ConnectMessageType.PAIRED: {
          if (this.status === SessionStatus.PAIRED) return;
          if (!msg.value) return;
          if (!Object.keys(msg.value).includes('pubkey')) return;

          this.status = SessionStatus.PAIRED;
          const remote = msg.value.pubkey;
          this.remote = remote;
          this.emit(ConnectMessageType.PAIRED, msg);
          break;
        }
        case ConnectMessageType.UNPAIRED: {
          if (this.status !== SessionStatus.PAIRED) return;
          this.status = SessionStatus.UNPAIRED;
          this.emit(ConnectMessageType.UNPAIRED);
          break;
        }
        case ConnectMessageType.GET_PUBLIC_KEY_REQUEST: {
          if (this.status !== SessionStatus.PAIRED) return;
          this.emit(ConnectMessageType.GET_PUBLIC_KEY_REQUEST, msg);
          break;
        }
        case ConnectMessageType.GET_PUBLIC_KEY_RESPONSE: {
          this.emit(ConnectMessageType.GET_PUBLIC_KEY_RESPONSE, msg);
          break;
        }
      }

    })

    sub.on('eose', () => {
      sub.unsub()
    })
  }

  emit(type: ConnectMessageType, value?: any): void {
    Object.values(this.listeners).forEach((listeners) => {
      if (listeners[type]) {
        listeners[type].forEach(cb => cb(value));
      }
    });
  }


  async pair(remoteSignerPrivateKey: string): Promise<void> {
    if (!remoteSignerPrivateKey) throw new Error('Signer private key is required');
    const remoteSignerPubKey = getPublicKey(remoteSignerPrivateKey);
    this.remote = remoteSignerPubKey;

    const message: PairingACK = {
      type: ConnectMessageType.PAIRED,
      value: { pubkey: this.remote },
    };
    const randomID = Math.random().toString().slice(2);
    const {event} = await prepareResponse(randomID, this.remote, this.target, message, remoteSignerPrivateKey);
    const id = await this.sendEvent(event, remoteSignerPrivateKey);
    console.log('sent pairing response from mobile', id);
  }


  async sendEvent(event: Event, secretKey: string): Promise<string> {
    const id = getEventHash(event);
    const sig = signEvent(event, secretKey);

    const signedEvent = { ...event, id, sig };
    let ok = validateEvent(signedEvent);
    let veryOk = verifySignature(signedEvent);
    if (!ok || !veryOk) {
      throw new Error('Event is not valid');
    }

    const relay = relayInit(this.relay);
    await relay.connect();
    relay.on('error', () => { throw new Error(`failed to connect to ${relay.url}`) });

    return new Promise((resolve, reject) => {
      const pub = relay.publish(signedEvent);
      pub.on('failed', (reason: any) => reject(reason));
      pub.on('seen', () => resolve(id));
    });
  }
}

function emptyListeners(): {} {
  let data: any = {};
  Object.values(ConnectMessageType).forEach((type) => {
    data[type] = [];
  });
  return data;
}