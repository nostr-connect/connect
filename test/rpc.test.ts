import { NostrRPC } from '../src/rpc';
import { sleep } from './utils';

class Server extends NostrRPC {
  async ping(): Promise<string> {
    return 'pong';
  }
}

jest.setTimeout(5000);

describe('Nostr RPC', () => {
  it('ping pong', async () => {
    const server = new Server({
      secretKey:
        'ed779ff047f99c95f732b22c9f8f842afb870c740aab591776ebc7b64e83cf6c',
    });
    await server.listen();

    const client = new NostrRPC({
      secretKey:
        '5acff99d1ad3e1706360d213fd69203312d9b5e91a2d5f2e06100cc6f686e5b3',
    });

    await sleep(1000);

    const result = await client.call({
      target: server.self.pubkey,
      request: { method: 'ping' },
    });
    expect(result).toBe('pong');
  });
});
