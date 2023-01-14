import { NostrRPC } from './rpc';

export class NostrSigner extends NostrRPC {
  connectedAppIDs: string[];
  constructor(opts: { relay?: string | undefined; secretKey: string }) {
    super(opts);
    this.connectedAppIDs = [];
  }

  addConnectedApp = (pubkey: string) => {
    this.connectedAppIDs.push(pubkey);
  };

  removeConnectedApp = (pubkey: string) => {
    this.connectedAppIDs = this.connectedAppIDs.filter(
      (id: string) => id !== pubkey
    );
  };

  isConnected(pubkey: string): boolean {
    return this.connectedAppIDs.includes(pubkey);
  }
}
