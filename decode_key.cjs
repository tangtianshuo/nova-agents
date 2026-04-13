const fs = require('fs');

const pubpath = 'D:\\Projects\\Tauri\\nova-agents\\~\\.tauri\\nova-agents.key.pub';
const privpath = 'D:\\Projects\\Tauri\\nova-agents\\~\\.tauri\\nova-agents.key';

const pubkeyB64 = fs.readFileSync(pubpath, 'utf8').replace(/\n/g, '').trim();
const privkeyB64 = fs.readFileSync(privpath, 'utf8').replace(/\n/g, '').trim();

const pubBuf = Buffer.from(pubkeyB64, 'base64');
const privBuf = Buffer.from(privkeyB64, 'base64');

console.log('pubBuf.length:', pubBuf.length);
console.log('privBuf.length:', privBuf.length);

const hex = pubBuf.toString('hex');
console.log('hex length (chars):', hex.length);
console.log('hex:', hex);

// The hex is:
// 1. "untrusted comment: minisign public key: 4BF1203B77A43775\n" (56 chars = 28 bytes ASCII)
// 2. base64-encoded binary

// 28 + (remaining * 4/3) = 114
// remaining * 4/3 = 86
// remaining * 6/8 = 64.5... hmm

// Let me look at it differently
// The base64 decodes to BOTH the comment text AND binary data
// The comment text "untrusted comment: minisign public key: 4BF1203B77A43775" = 56 ASCII chars
// But we have 114 bytes total...

// Let me check if the last 96 bytes (of the 114) give us the expected structure
// bytes 18-113 would be: 114 - 18 = 96
// But we expect: 2 + 8 + 32 + 64 = 106 bytes of actual key data

// Wait - maybe the first part of the decoded output is the ASCII comment
// encoded as part of the base64?? That doesn't make sense.

// Actually, let me try a different approach:
// The minisign public key FILE contains two lines:
// Line 1: "untrusted comment: minisign public key: <key_id>\n" (ASCII, not base64)
// Line 2: base64(sig_type || key_id || ed25519_pubkey || ed25519_sig)

// When we decode line 2 base64, we should get 106 bytes
// 152 base64 chars * 6 bits/char = 912 bits = 114 bytes
// But 106 bytes of actual data needs 142 base64 chars (142*6/8 = 106.5)

// Hmm, let me just look at the raw decoded bytes and try different offsets to find
// a valid Ed25519 key pair structure

console.log('\n--- Trying different extraction offsets ---');
for (let offset = 0; offset <= 20; offset++) {
    const end = offset + 32;
    if (end <= pubBuf.length) {
        const slice = pubBuf.slice(offset, end);
        console.log(`Offset ${offset}-${end}: hex=${slice.toString('hex')} b64=${slice.toString('base64')}`);
    }
}

// Now let me check the private key structure
console.log('\n--- Private key analysis ---');
console.log('First 40 hex:', privBuf.slice(0, 40).toString('hex'));
console.log('Last 80 hex:', privBuf.slice(-80).toString('hex'));

// The minisign private key format when decoded should have:
// sig_type(2) + key_id(8) + ed25519_pubkey(32) + ed25519_sig(64) + ...encrypted stuff...
