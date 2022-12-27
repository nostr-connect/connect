import {
  generatePrivateKey,
  getPublicKey,
  validateEvent,
  verifySignature,
  signEvent,
  getEventHash,
  Event,
  relayInit,
  nip04
} from 'nostr-tools'

const KEY_MANAGER = "40852bb98e00d3e242d6a9717ede49574168ecef83841ce88f56699cc83f3085";

export class Session {
  request: {
    name: string;
    description: any;
    url: any;
    icons: any;
  };
  pubKey: string;
  private secretKey: string;

  
  constructor({
    name,
    description,
    url,
    icons,
  }: {
    name: string,
    description?: string
    url: string,
    icons: string[],
  }) {
    // Generate an ephemeral identity for this session in the app
    let sk = generatePrivateKey()
    let pk = getPublicKey(sk)
    this.secretKey = sk;
    this.pubKey = pk;

    this.request = {
      name,
      description,
      url,
      icons,
    };
    console.log(`Session with   pubKey: ${this.pubKey}`)
  }

  async startPairing(walletPubKey: string = KEY_MANAGER) {
    const payload = JSON.stringify(this.request);
    const cipherText = await nip04.encrypt(this.secretKey, walletPubKey, payload);
    let event: Event = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: this.pubKey,
      tags: [['p', walletPubKey]],
      content: cipherText,
    }
    await this.sendEvent(event)  
  }

  async sendEvent(event: Event) {
    const id = getEventHash(event)
    const sig = signEvent(event, this.secretKey)

    const signedEvent = { ...event, id, sig };
    let ok = validateEvent(signedEvent)
    let veryOk = verifySignature(signedEvent)
    console.log(ok, veryOk)
    if (!ok || !veryOk) {
      throw new Error('Event is not valid')
    }

    const relay = relayInit('wss://nostr.vulpem.com')

    await relay.connect();
    relay.on('connect', () => {
      console.log(`connected to ${relay.url}`)
    })
    relay.on('error', () => {
      throw new Error(`failed to connect to ${relay.url}`);
    })


    let pub = relay.publish(signedEvent);
    console.log(signedEvent);

    pub.on('ok', () => {
      console.log(`${relay.url} has accepted our event`)
    })
    pub.on('seen', () => {
      console.log(`we saw the event on ${relay.url}`)
    })
    pub.on('failed', (reason: any) => {
      console.error(reason);
      console.log(`failed to publish to ${relay.url}: ${reason}`)
    })
  }

}