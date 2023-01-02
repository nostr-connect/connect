//setupTests.tsx
import crypto from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

Object.defineProperty(global.self, 'crypto', {
  value: crypto.webcrypto,
});
