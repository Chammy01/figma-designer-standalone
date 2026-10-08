import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Module-relative Go filenames are public identifiers; absolute build paths are not.
function privatePaths(text) {
  const matches = [...text.matchAll(/(?<![A-Za-z0-9])[A-Za-z]:[\\/](?:[A-Za-z0-9_. -]{3,}[\\/])+[A-Za-z0-9_.-]+|[A-Za-z]:[\\/](?:Users|Program Files|Go|checkout|workspace|source|build)\b|\/(?:Users|home|root)\/[A-Za-z0-9_.\/-]+|\/(?:tmp|private\/var\/folders)\/[A-Za-z0-9_.\/-]*go-build[A-Za-z0-9_.\/-]*/g)];
  return matches.filter(m => {
    // Go embeds public root certificates; their URLs can contain /root/.
    const prefix = text.slice(Math.max(0, m.index - 200), m.index);
    return !/https?:\/\/[^\s\x00]*$/.test(prefix);
  }).map(m => m[0]);
}
function scan(bytes) {
  return [...privatePaths(bytes.toString('latin1')), ...privatePaths(bytes.toString('utf16le')), ...privatePaths(bytes.subarray(1).toString('utf16le'))];
}
if (process.argv[2] === '--self-check') {
  assert.equal(scan(Buffer.from('github.com/example/module@v1.0/file.go\0runtime/proc.go')).length, 0);
  assert.equal(scan(Buffer.from('https://example.com/certificate\0http://localhost/')).length, 0);
  assert.equal(scan(Buffer.from('json:\\"name\\"')).length, 0);
  for (const path of ['C:\\Users\\builder\\source\\main.go', 'E:/checkout/main.go', '/tmp/go-build123/main.go', '/home/builder/main.go']) {
    assert.ok(scan(Buffer.from(path)).length);
    assert.ok(scan(Buffer.from(path, 'utf16le')).length);
    assert.ok(scan(Buffer.concat([Buffer.from([0]), Buffer.from(path, 'utf16le')])).length);
  }
  console.log('Binary privacy scanner self-check PASS: ASCII and aligned/unaligned UTF-16 paths; public module paths accepted.');
} else {
  assert.ok(process.argv.length > 2, 'Pass distributable binaries or --self-check.');
  for (const file of process.argv.slice(2)) {
    const paths = scan(readFileSync(file));
    // Do not echo private strings into distributable evidence.
    assert.equal(paths.length, 0, `${file}: ${paths.length} absolute/private path matches; launch blocked.`);
    console.log(`${file}: PASS (no absolute Windows/user/Go workspace paths in ASCII or UTF-16).`);
  }
}
