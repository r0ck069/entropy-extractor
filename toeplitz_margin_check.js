// Test di regressione del bound LHL PER BLOCCO Toeplitz (punto 22, 01/10/2026).
// Esegue il codice reale di entropy-extractor-unified.html e controlla lhlSafeBlockOutBits.
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
core = core.replace(/\}\)\(\);\s*$/, 'globalThis.__f={lhlSafeBlockOutBits:lhlSafeBlockOutBits,TOEPLITZ_IN:TOEPLITZ_IN};\n})();');
eval(core);
const { lhlSafeBlockOutBits, TOEPLITZ_IN } = globalThis.__f;

let fail = 0;
function check(name, ok, detail){ if(!ok){ fail++; console.log('FALLITO:', name, detail||''); } }

// 1) valori noti (calcolati a mano: 512h - 2(k+log2 B), parte intera inferiore)
check('h=0.5 B=1757 k=40 -> 154', lhlSafeBlockOutBits(0.5, 1757, 40) === 154, lhlSafeBlockOutBits(0.5,1757,40));
check('h=1 B=1 k=40 -> 432', lhlSafeBlockOutBits(1, 1, 40) === 432, lhlSafeBlockOutBits(1,1,40));
check('h=0.3 B=1757 k=40 -> 52', lhlSafeBlockOutBits(0.3, 1757, 40) === 52, lhlSafeBlockOutBits(0.3,1757,40));
// 2) casi limite: nessun blocco, h non valida, margine che supera l'entropia del blocco
check('B=0 -> 0', lhlSafeBlockOutBits(0.9, 0, 40) === 0);
check('h=NaN -> 0', lhlSafeBlockOutBits(NaN, 100, 40) === 0);
check('h=0 -> 0', lhlSafeBlockOutBits(0, 100, 40) === 0);
check('h=0.1 -> 0 (51 bit < margine)', lhlSafeBlockOutBits(0.1, 100, 40) === 0);
// 3) proprietà: per ogni (h, B, k) l'epsilon totale garantito B*1/2*2^(-(512h-m)/2) è <= 2^-k
let n = 0;
for (let i = 0; i < 20000; i++){
  const h = Math.random(), B = 1 + Math.floor(Math.random() * 20000), k = [16,20,40,64,80][i % 5];
  const m = lhlSafeBlockOutBits(h, B, k);
  if (m > 0){
    n++;
    const epsTot = B * 0.5 * Math.pow(2, -(TOEPLITZ_IN * h - m) / 2);
    check('eps totale <= 2^-k', epsTot <= Math.pow(2, -k) * (1 + 1e-12), 'h=' + h + ' B=' + B + ' k=' + k + ' m=' + m + ' eps=' + epsTot);
    check('m <= 512h', m <= TOEPLITZ_IN * h);
  }
}
// 4) il vecchio calcolo globale NON garantiva lo stesso: con h=0.5, n=1e6, k=40 dava 217 bit/blocco
const oldM = Math.min(Math.floor(512 * Math.min(0.85*0.5, (0.5*1e6 - 80)/1e6, 0.9)), 256);
check('documentazione: il vecchio calcolo dava 217 bit/blocco', oldM === 217, oldM);
check('il nuovo calcolo è più prudente del vecchio nel regime h=0.5', lhlSafeBlockOutBits(0.5, 1757, 40) < oldM);
console.log(fail === 0 ? 'toeplitz_margin_check: TUTTO OK (' + n + ' casi casuali con m>0)' : 'toeplitz_margin_check: ' + fail + ' FALLIMENTI');
process.exit(fail === 0 ? 0 : 1);
