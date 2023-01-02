import { nip04, Event } from 'nostr-tools';
import { NostrRPC, NostrRPCServer, prepareEvent, prepareResponse } from '../src/request';

class Example extends NostrRPCServer {
  async ping(): Promise<string> {
    return 'pong';
  }
}

jest.setTimeout(10000);

describe('Nostr RPC', () => {
  it('starts a server', async () => {
    const server = new Example({
      secretKey: "ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c",
    });
    const sub = await server.listen();
    sub.on('event', async (event: Event) => {
      let plaintext;
      let payload;
      try {
        plaintext = await nip04.decrypt(server.self.secret, event.pubkey, event.content);
        payload = JSON.parse(plaintext);
      } catch(ignore) {
        return;
      }

      // ignore all the events that are not NostrRPCRequest events
      if (!plaintext) return;
      if (!payload) return;
      if (!Object.keys(payload).includes('id') || !Object.keys(payload).includes('method') || !Object.keys(payload).includes('params')) return;
      
      // handle request
      const response = {
        id: payload.id,
        result: "pong",
        error: null,
      }
      const body = prepareResponse(response.id, response.result, response.error);
      const responseEvent = await prepareEvent(server.self.secret, event.pubkey, body);

      console.log('response to be sent', responseEvent)
      // send response via relay
      const pub = server.relay.publish(responseEvent);
      pub.on('failed', console.error);
    });

    sub.on('eose', () => {
      sub.unsub();
    });

    const client = new NostrRPC({
      secretKey: "5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3",
      target: server.self.pubkey,
    });
    console.log(`from: ` + client.self.pubkey, `to: ` + server.self.pubkey);

    await sleep(2000);

    const result = await client.call({ method: 'ping' });
    console.log(result);
  })
})

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}