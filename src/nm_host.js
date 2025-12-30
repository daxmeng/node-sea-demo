// host.js
const fs = require('node:fs');
let buffer = Buffer.alloc(0);

process.stdin.on('data', chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const len = buffer.readUInt32LE(0);
    if (buffer.length < 4 + len) return;

    const body = buffer.slice(4, 4 + len).toString('utf8');
    const msg = JSON.parse(body);
    send({ reply: 'Hello from native host', received: msg });

    buffer = buffer.slice(4 + len);
  }
});

function send(obj) {
  const json = JSON.stringify(obj);
  const buf = Buffer.alloc(4 + Buffer.byteLength(json));
  buf.writeUInt32LE(Buffer.byteLength(json), 0);
  buf.write(json, 4);
  process.stdout.write(buf);
}
