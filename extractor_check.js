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
core = core.replace(/\}\)\(\);\s*$/, 'globalThis.__f={combinedHmin:combinedHmin,peresExtract:peresExtract};\n})();');
eval(core);
const combinedHmin = globalThis.__f.combinedHmin;
const peresExtract = globalThis.__f.peresExtract;
function randBits(n) { const b = nodeCrypto.randomBytes(Math.ceil(n/8)); const out=[]; for(let i=0;i<n;i++) out.push((b[i>>3]>>(7-(i&7)))&1); return out; }
function correlatedBits(n, p) { const out=[nodeCrypto.randomInt(0,2)]; for(let i=1;i<n;i++){ out.push(nodeCrypto.randomInt(0,1e6)<p*1e6?out[i-1]:1-out[i-1]); } return out; }
function trueEnt(n,p){ const h2=-(p*Math.log2(p)+(1-p)*Math.log2(1-p)); return n*h2; }
function pipeline(bits) {
  const sourceEnt = combinedHmin(bits);
  const peresRes = peresExtract(bits);
  const postEnt = combinedHmin(peresRes.bits);
  return { inputBits: bits.length, peresOutBits: peresRes.bits.length,
    hMinPre: +sourceEnt.hMin.toFixed(3), hMinPost: +postEnt.hMin.toFixed(3),
    creditedIfPost: +(postEnt.hMin*peresRes.bits.length).toFixed(1),
    creditedIfPre: +(sourceEnt.hMin*bits.length).toFixed(1) };
}
console.log('Perfetto:', pipeline(randBits(200000)));
console.log('Correlato75 (vera~'+trueEnt(200000,0.75).toFixed(0)+'):', pipeline(correlatedBits(200000,0.75)));
console.log('Correlato90 (vera~'+trueEnt(200000,0.90).toFixed(0)+'):', pipeline(correlatedBits(200000,0.90)));
