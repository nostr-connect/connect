import { NostrRPC } from '../src/request';

class Server extends NostrRPC {
  async ping(): Promise<string> {
    return 'pong';
  }
}

jest.setTimeout(10000);

describe('Nostr RPC', () => {
  it('starts a server', async () => {
    const server = new Server({
      secretKey:
        'ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c',
    });
    await server.listen();

    const client = new NostrRPC({
      secretKey:
        '5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3',
    });
    console.log(`from: ` + client.self.pubkey, `to: ` + server.self.pubkey);

    await sleep(2000);

    const result = await client.call({
      target: server.self.pubkey,
      request: { method: 'ping' },
    });
    console.log(result);
  });
});

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
