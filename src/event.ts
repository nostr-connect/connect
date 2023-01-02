import { nip04, Event } from "nostr-tools";
import { ConnectMessage } from "./connect";

export async function prepareRequest(from: string, to: string, request: ConnectMessage, fromSecretKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const requestID = Math.random().toString().slice(2);
  const cipherText = await nip04.encrypt(
    fromSecretKey, 
    to, 
    JSON.stringify({
      requestID: requestID,
      request,
    }),
  );
  const event: Event = {
    kind: 4,
    created_at: now,
    pubkey: from,
    tags: [['p', to]],
    content: cipherText,
  };
  return {event, requestID};
}

export async function prepareResponse(requestID: string, from: string, to: string, response: ConnectMessage, fromSecretKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const cipherText = await nip04.encrypt(
    fromSecretKey, 
    to, 
    JSON.stringify({
      requestID: requestID,
      response,
    }),
  );
  const event: Event = {
    kind: 4,
    created_at: now,
    pubkey: from,
    tags: [['p', to]],
    content: cipherText,
  };
  return { event, requestID };
}