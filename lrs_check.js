const fs = require('fs');
const nodeCrypto = require('crypto');
function fakeEl(){ return new Proxy({}, { get: () => (() => fakeEl()) }); }
global.document = new Proxy({}, { get: () => (() => fakeEl()) });
global.window = { crypto: { getRandomValues: (arr) => { const b = nodeCrypto.randomBytes(arr.length * (arr.BYTES_PER_ELEMENT||4)); const view = new Uint8Array(b); for(let i=0;i<arr.length;i++){ arr[i]=0; for(let k=0;k<(arr.BYTES_PER_ELEMENT||4);k++){ arr[i] |= view[i*(arr.BYTES_PER_ELEMENT||4)+k] << (8*k); } } return arr; } }, console: console };
const html = fs.readFileSync('./entropy-extractor-unified.html', 'utf8');
const startTag = '<script id="core-script">';
const startIdx = html.indexOf(startTag) + startTag.length;
const endIdx = html.lastIndexOf('</script>');
let core = html.slice(startIdx, endIdx);
core = core.replace(/\}\)\(\);\s*$/, 'globalThis.__f={lrsHmin:lrsHmin};\n})();');
eval(core);
const lrsHmin = globalThis.__f.lrsHmin;
function randBits(n) { const b = nodeCrypto.randomBytes(Math.ceil(n/8)); const out=[]; for(let i=0;i<n;i++) out.push((b[i>>3]>>(7-(i&7)))&1); return out; }
for (const n of [1000, 20000, 100000]) {
  const bits = randBits(n);
  const res = lrsHmin(bits);
  console.log('n='+n, JSON.stringify(res));
}
