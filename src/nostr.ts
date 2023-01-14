import { NostrRPC } from './rpc';

export class NostrSigner extends NostrRPC {
  async disconnect(): Promise<null> {
    this.events.emit('disconnect');
    return null;
  }
  isConnected(): boolean {
    throw new Error('Method not implemented yet.');
  }
}
