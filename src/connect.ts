import { Event, nip04, relayInit } from "nostr-tools";
import { prepareRequest, prepareResponse } from "./event";
import { Session, SessionStatus } from "./session";

export interface ConnectMessage {
  type: ConnectMessageType,
  value?: any
  requestID?: string,
}

export enum ConnectMessageType {
  PAIRED = 'paired',
  UNPAIRED = 'unpaired',
  GET_PUBLIC_KEY_REQUEST = 'getPublicKeyRequest',
  GET_PUBLIC_KEY_RESPONSE = 'getPublicKeyResponse',
}

export interface PairingACK extends ConnectMessage {
  type: ConnectMessageType.PAIRED,
  value: {
    pubkey: string,
  }
}

export interface PairingNACK extends ConnectMessage {
  type: ConnectMessageType.UNPAIRED
}

export interface GetPublicKeyRequest extends ConnectMessage {
  type: ConnectMessageType.GET_PUBLIC_KEY_REQUEST
}

export interface GetPublicKeyResponse extends ConnectMessage {
  type: ConnectMessageType.GET_PUBLIC_KEY_RESPONSE,
  value: {
    pubkey: string,
  }
}

export function responseTypeForRequestType(type: ConnectMessageType): ConnectMessageType {
  switch (type) {
    case ConnectMessageType.GET_PUBLIC_KEY_REQUEST:
      return ConnectMessageType.GET_PUBLIC_KEY_RESPONSE;
    default:
      throw new Error('Invalid request type');
  }
}

export class Connect {
  session: Session;
  private targetPrivateKey: string;

  constructor({
    session,
    targetPrivateKey,
  }: {
    session: Session;
    targetPrivateKey: string;
  }) {
    this.session = session;
    this.targetPrivateKey = targetPrivateKey;
  }

  async sendMessage(message: ConnectMessage): Promise<ConnectMessage> {
    if (this.session.status !== SessionStatus.PAIRED) throw new Error('Session is not paired');
    if (!this.session.target) throw new Error('Target is required');
    if (!this.session.remote) throw new Error('Remote is required');

    const { target, remote } = this.session;

    // send request to remote
    const {event, requestID} = await prepareRequest(target, remote, message, this.targetPrivateKey);
    console.log(`sending message ${message.type} with requestID ${requestID}`);
    const id = await this.session.sendEvent(event, this.targetPrivateKey);
    if (!id) throw new Error('Failed to send message ' + message.type);
    console.log('sent message with nostr id', id);

    const relay = relayInit(this.session.relay);
    await relay.connect();

    return new Promise((resolve, reject) => {
      relay.on('error', () => { 
        reject(`failed to connect to ${relay.url}`);
      });
  
      // waiting for response from remote
      let sub = relay.sub([{
        kinds: [4],
        authors: [remote],
        //since: now,
        "#p": [target],
        limit: 1,
      }]);
  
  
      sub.on('event', async (event: Event) => {
        const plaintext = await nip04.decrypt(this.targetPrivateKey, event.pubkey, event.content);
        console.log('plaintext', plaintext);
        console.log('requestID', requestID);
        const payload = JSON.parse(plaintext);
        if (!payload) return;
        if (!Object.keys(payload).includes('requestID') || !Object.keys(payload).includes('message')) return;
        if (payload.requestID !== requestID) return;
        const msg = payload.message as ConnectMessage;
        const responseType = responseTypeForRequestType(msg.type);
        if (msg.type !== responseType) return;
        resolve(msg);
      });
  
      sub.on('eose', () => {
        sub.unsub();
      });
    });
    
  }



  async getPublicKey(): Promise<string> {
    const response: ConnectMessage = await this.sendMessage({
      type: ConnectMessageType.GET_PUBLIC_KEY_REQUEST
    });
    if (response.type !== ConnectMessageType.GET_PUBLIC_KEY_RESPONSE) throw new Error('Invalid response type');
    return response.value.pubkey;
  }

  async signEvent(_event: Event): Promise<Event> {
    throw new Error('Not implemented');
  }

  async getRelays(): Promise<{ [url: string]: { read: boolean, write: boolean } }> {
    throw new Error('Not implemented');
  }

  nip04 = {
    encrypt: async (_pubkey: string, _plaintext: string): Promise<string> => {
      throw new Error('Not implemented');
    },
    decrypt: async (_pubkey: string, _ciphertext: string): Promise<string> => {
      throw new Error('Not implemented');
    }
  }

  async request(_opts: { method: string, params: any }): Promise<any> {
    throw new Error('Not implemented');
  }

}