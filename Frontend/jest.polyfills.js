/**
 * Jest Polyfills
 * Must run BEFORE any modules are imported
 */

const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
const { BroadcastChannel } = require('worker_threads');

// Polyfill TextEncoder/TextDecoder for Node.js
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Web Streams API
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Polyfill BroadcastChannel for MSW
global.BroadcastChannel = BroadcastChannel;

// Polyfill fetch API
global.fetch = global.fetch || undefined;
