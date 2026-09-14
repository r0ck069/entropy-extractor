# Changelog

## v4.0.0-beta2 (2026-09-13) — BETA, non ancora pubblicata su GitHub

**Stato: da verificare e auditare prima del rilascio pubblico.** SHA-256 del file
`entropy-extractor-unified.html` di questa build:
`911cdf114b8620301ae8bc815c39c3fd74911af1d65e4ecda4e760c700473964`.

### Batteria NIST SP 800-22 estesa da 4 a 9 procedure

Aggiunti 4 test, adottati da un'analisi di terze parti dopo verifica matematica
indipendente completa (stesso processo già applicato a EntropyPipeline, v2.0.0-beta2):

- **Serial Test** (∇ψ²m/∇²ψ²m, m=3) — con estensione ciclica del campione.
- **Approximate Entropy** (m=2) — con estensione ciclica del campione.
- **Cumulative Sums**, direzione diretta e inversa (2 righe distinte).
- **Binary Matrix Rank** (32×32, rango su GF(2) per eliminazione gaussiana).

Riusano `erfc`/`gammln`/`igamc` già presenti e già verificati in questo file —
nessuna macchina matematica ridondante introdotta.

**Verifica eseguita, con dati reali**:
1. Valori analitici/tabulati noti: Γ(6)=120, P(χ²₁>3.841)≈0.05, P(χ²₂>9.210)≈0.01
(quest'ultimo usato dal Rank Test) — tutti confermati a 4+ cifre.
2. Casi avversari (tutti-zero, tutti-uno): tutti e 4 i nuovi test FALLISCONO
correttamente (p≈0), come deve essere per sequenze palesemente non casuali.
3. **Tasso di falsi positivi su 300 sequenze CSPRNG reali indipendenti** (50.000
bit ciascuna, `crypto.getRandomValues`): per ciascuno dei 4 nuovi test, il
numero di fallimenti osservati è risultato entro 3 deviazioni standard dal
tasso teorico atteso (~1%, ~2% per Serial che richiede entrambi i p-value
≥0.01). Questo verifica che il tasso di falso allarme REALE coincida con
quello dichiarato, non solo che la funzione non vada in crash.
4. Suite di autotest interna (19 controlli) rieseguita per intero: nessuna
regressione.

**Non incluse, stessa motivazione già data per EntropyPipeline**: DFT/Spettrale,
Linear Complexity, Maurer's Universal, Template Matching (×2), Random Excursions
(×2) — non sottoposte allo stesso livello di verifica in questa iterazione.

### Margine di sicurezza LHL selezionabile (ε=2⁻ᵏ)

Prima fisso a ε=2⁻⁴⁰ (`LHL_EPSILON_BITS=40`, mai esposto all'utente). Ora
selezionabile fra 2⁻¹⁶/2⁻²⁰/2⁻⁴⁰/2⁻⁶⁴/2⁻⁸⁰, con **k=40 mantenuto come default**
per non alterare il comportamento preesistente di chi non tocca il selettore.
Scendere sotto k=40 richiede una conferma esplicita (una sola volta per
sessione); salire non la richiede mai. A differenza di EntropyPipeline, qui il
margine non blocca/sblocca un'estrazione (non esiste un gate binario in questo
tool) — regola con continuità il rapporto di estrazione Toeplitz tramite
`ratioFromLHL`, uno dei tre fattori del `Math.min()` che determina
`extractionRatio`.

### Demo sbilanciata (test) — un bug reale trovato e corretto DURANTE lo sviluppo di questa funzionalità

Pulsante che genera con CSPRNG reale un buffer di test per esercitare il gate
`H_min<0.05`. **Prima versione (scartata dopo il test, mai pubblicata)**:
forzava un bias su OGNI bit di ogni byte. Testandola con CSPRNG reale, il
gate NON scattava mai, nonostante un bias nominale forte (p=0.99): il filtro
saturazione/silenzio esclude i campioni ai valori estremi (0x0000/0xFFFF...),
e quando OGNI bit è fortemente sbilanciato la stragrande maggioranza dei
campioni finisce esattamente a un estremo — il filtro li scarta, lasciando nel
campione superstite un bias apparente molto più debole di quello impostato.
**Versione corretta e pubblicata**: il bias (p(1)≈0.98) è forzato SOLO sul
bit-plane attualmente selezionato; tutti gli altri 15 bit del campione restano
uniformemente casuali, rendendo trascurabile la probabilità di un campione
"tutto a un estremo". Verificato con test reale: H_min misurato dal vero
stimatore del tool crolla a ≈0.03, il gate scatta correttamente ("Nessuna
finestra indipendente ha superato i gate").

### Non portate da EntropyPipeline, con motivazione esplicita

- **Assistente CSV/sensore → bit grezzi** e **parsing tollerante + lista di
byte**: entrambe le feature erano pensate per l'input manuale incollato di
EntropyPipeline. `entropy-extractor` accetta già file grezzi arbitrari in
caricamento diretto — non ha una casella di testo per bit/hex in Fase 1 a cui
applicare queste migliorie. Nessun beneficio dal portarle qui as-is.
- **Tag di dominio prima della concatenazione multi-sorgente**: documentato
come principio in `SECURITY-NOTES.md` insieme alla spiegazione di perché non
si applica direttamente a questo tool (nessuna combinazione multi-sorgente
qui: una sola sorgente file per finestra).

---

## v4.0.0-beta1 (2026-09-13) — BETA, non ancora pubblicata su GitHub

**Stato: da verificare e auditare prima del rilascio pubblico.** SHA-256 del file
`entropy-extractor-unified.html` di questa build: `9a51dd2695a541a50041a7738c243a8d500536e6de8dbc06037b2147657fc9e3`.

### Aggiunte

1. **Bit-plane arbitrario** (Fase di estrazione): selettore 0=LSB...MSB al posto del
solo LSB, con opzioni popolate dinamicamente in base alla larghezza campione
scelta. Utile per sorgenti dove il rumore non si concentra necessariamente nel
bit meno significativo.
2. **Hash di integrità dell'applicazione**: SHA-256 del blocco `<script
id="core-script">`, calcolato e mostrato al caricamento — controllo diagnostico
(non una firma digitale del file intero) per verificare di star eseguendo il
codice atteso, specialmente offline.
3. **Fusione best-2 delle finestre spaziali** (nuova card bonus, non compete per
la selezione principale): se almeno due fra le finestre 1/2/3 superano i propri
gate e risultano statisticamente indipendenti fra loro (nessun avviso di
correlazione), le due con min-entropia pre-Toeplitz più alta vengono fuse per
concatenazione (proprietà additiva sotto indipendenza, già verificata dal
controllo di correlazione esistente) e rielaborate come pool unico attraverso
Peres→Toeplitz. Puramente informativa/bonus: non altera in alcun modo la logica
di selezione della finestra "vincente" già esistente.
4. **Tetto di emissione conservativo** ⌊TOEPLITZ_IN/2⌋ = 256 bit per blocco,
indipendente dal bound LHL già calcolato — rete di sicurezza a basso costo.
**Nota di comportamento**: questo abbassa il rapporto di estrazione massimo
pratico (prima fino al 90% di 512=460 bit/blocco in scenari di entropia molto
alta, ora sempre ≤256 bit/blocco), a vantaggio della sicurezza. Su sorgenti di
qualità normale/moderata il rapporto era già ben sotto questa soglia, quindi
l'effetto pratico è visibile solo su sorgenti di altissima entropia misurata.

### Riorganizzazione della documentazione (nessun cambiamento funzionale sul resto)

Il pannello "DOCUMENTAZIONE E ASSUNZIONI" con il changelog di unificazione a 13
punti, prima incorporato nell'HTML, è stato spostato in `AUDIT-NOTES.md`.
Aggiunto `SECURITY-NOTES.md` con i principi di design trasversali (condivisi con
`EntropyPipeline` e `entropy-extractor-raw-2photo`, stesso autore). L'HTML
riporta ora solo l'essenziale operativo e i limiti indispensabili all'uso.

### Verifica eseguita prima di questo commit

Il nucleo matematico/crittografico (SHA-256/HMAC/HKDF, Clopper-Pearson, Peres
Extractor, Toeplitz, SHAKE256, stimatori MCV/Collision/t-Tuple/LRS, RCT/APT,
correlazione multi-lag) è **invariato** rispetto alla v3. Le funzioni nuove sono
state verificate con: (a) l'intera suite di autotest esistente della pagina,
rieseguita senza regressioni; (b) un harness Node.js dedicato che simula
l'intera pipeline end-to-end (caricamento file sintetico, click su AVVIA,
rendering di tutte le card incluse Fusione e Spettro Totale) su una sorgente
pseudo-casuale di 200.000 campioni — nessuna eccezione, nessun FAIL negli
autotest, tetto di emissione e bit-plane confermati funzionanti nell'output
renderizzato. Non ancora sottoposto ad audit indipendente da terzi. **Non
pubblicare su GitHub prima di un audit.**

### Non incluso in questa beta, con motivazione

- **Modalità di combinazione multi-sorgente** (Concat/XOR/Interleave): non si
adatta all'architettura a sorgente-file-singola di questo tool (a differenza di
`EntropyPipeline`, che accetta 1-4 sorgenti indipendenti incollate).
- **Selezione bit per qualità/varianza locale** (per input audio): rischio di
interazione con le soglie di gate (`MIN_SOURCE_HMIN_RATE`, gate strutturale
t-Tuple/LRS) già calibrate empiricamente sul flusso LSB sequenziale — richiede
una ricalibrazione e un audit dedicati prima di essere introdotta.
- **Campionamento da posizioni prime**: stesso motivo — cambierebbe la
distribuzione dei campioni osservati dai gate già calibrati.
- **Pipeline di confronto diagnostica XOR-LFSR**: rimandata per limiti di tempo
in questa iterazione, non per motivi tecnici. Pianificata per una beta
successiva.

---

## v3 — Portati SHAKE256, t-Tuple/LRS, RCT/APT da EntropyPipeline (2026-09-11)

Portati da `EntropyPipeline` (stesso autore, stesso repository owner), lo strumento
"manuale" con incolla-bit da cui questo tool eredita il motore matematico di base:
quattro elementi che lì esistevano ma qui mancavano.

- **SHAKE256** (Keccak-f[1600] puro JS, funzione XOF a lunghezza variabile):
`crypto.subtle` del browser non lo implementa nativamente. Verificato contro i
vettori di test ufficiali NIST prima dell'integrazione. Aggiunto un pulsante
opzionale accanto al digest SHA-256 sulla finestra vincente, a parità di
lunghezza di output.
- **t-Tuple e Longest Repeated Substring (LRS)** (SP 800-90B §6.3): stimatori di
min-entropia di ordine superiore, capaci di rilevare strutture periodiche/ripetute
che MCV e Collision (statistiche di ordine 0/1) non vedono per costruzione.
- **Repetition Count Test (RCT) e Adaptive Proportion Test (APT)** (SP 800-90B §4.4):
health test retrospettivi applicati ai bit LSB grezzi di ciascuna finestra, prima
del debiasing di Peres.

Tre adattamenti espliciti, resi necessari dal contesto diverso (flussi automatici di
centinaia di migliaia di bit per finestra, contro le centinaia/migliaia di bit
incollati a mano della sorgente originale):

1. **t-Tuple/LRS limitati a un campione di 20.000 bit per finestra** (`TTUPLE_LRS_SAMPLE_CAP`), per restare entro un tempo di calcolo ragionevole.
2. **Bug di scalabilità reale trovato e corretto durante il porting**: né t-Tuple né
LRS, nella sorgente originale, limitano la lunghezza massima di pattern esaminata.
Su una sequenza periodica il costo può esplodere a diversi miliardi di operazioni —
riprodotto: il porting iniziale ha bloccato la pipeline di test per minuti su un
singolo caso periodico. Corretto con due limiti (`TTUPLE_MAX_T=64`,
`LRS_MAX_SEARCH_LEN=256`), verificati non alterare il comportamento su rumore
reale né la rilevazione su sequenze periodiche/strutturate. **Lo stesso bug è stato
poi trovato e corretto anche in EntropyPipeline stesso** — vedi il CHANGELOG di
quel repository.
3. **t-Tuple/LRS non entrano nel calcolo della min-entropia che determina il rapporto
di estrazione Toeplitz** (a differenza della sorgente originale). Scoperto
empiricamente durante il testing: su campioni di decine di migliaia di bit, LRS in
particolare resta strutturalmente intorno a 0.35-0.43 bit/bit anche su rumore
CSPRNG perfettamente equo (natura conservativa nota del limite di confidenza di
Clopper-Pearson su un conteggio quasi sempre minimo, non un segnale reale di scarsa
entropia). Includerlo nel minimo avrebbe dimezzato il rapporto di estrazione
pratico su ogni analisi, anche perfettamente sana. Restano invece un **gate
strutturale dedicato** (soglie calibrate con ampio margine empirico: sorgenti
sane/moderatamente sbilanciate osservate a LRS≥0.21, t-Tuple≥0.29; sorgenti
periodiche/strutturate osservate a LRS≤0.015, t-Tuple≤0.05).

RCT/APT sono invece applicati senza campionamento (costo O(n)) come gate aggiuntivo
per finestra, con la stessa priorità "il più pessimista vince" degli altri gate.

Verificato con una suite di test end-to-end in Node.js prima del rilascio: unit test
sui singoli stimatori, l'intera suite di autotest della pagina, e simulazioni complete
della pipeline con sorgenti sintetiche sane e patologiche (run costante localizzato,
struttura periodica non costante) — eseguita ripetutamente senza flakiness, nessuna
eccezione, nessun blocco. Durante questo testing sono stati trovati e corretti, oltre
al bug di scalabilità sopra, un refuso di trascrizione nel vettore di test SHAKE256
(un carattere mancante — verificato e corretto contro l'implementazione nativa
OpenSSL/Node) e due soglie di autotest inizialmente mal calibrate.

## v2 — Audit matematico + correzioni reali + restyle (2026-09-10)

Prima di qualunque modifica estetica è stata condotta una verifica matematica
indipendente e sistematica dell'intera pipeline, come richiesto. Di seguito il
resoconto completo: cosa è stato verificato, cosa è risultato corretto, cosa è
stato trovato realmente rotto e come è stato corretto.

### Verificato e confermato corretto (nessuna modifica necessaria)

- **SHA-256** (implementazione JS pura): verificato contro il vettore di test
ufficiale (stringa vuota, `"abc"`) e contro l'implementazione nativa del
browser (`crypto.subtle`) su 200 input casuali di lunghezza variabile — nessun
mismatch.
- **HMAC-SHA256**: verificato contro il vettore di test ufficiale RFC 4231
(caso 1).
- **HKDF-Extract/Expand (RFC 5869)**: verificato contro il vettore di test
ufficiale, caso 1 (SHA-256) — sia il PRK intermedio sia l'OKM finale
corrispondono esattamente ai valori di riferimento.
- **Clopper-Pearson esatto** (beta incompleta regolarizzata + inversione per
bisezione): verificato per auto-consistenza (`betainc(betaInv(p))≈p`) e,
soprattutto, confrontato con il calcolo di riferimento di **SciPy** (`scipy.stats.beta.ppf`) su più combinazioni di parametri — corrispondenza
esatta a 12 cifre significative.
- **Collision Estimate corretta** (`p_max=[1+√(2·p_coll-1)]/2`): riprodotta
analiticamente (dalla relazione p_coll = p_max² + (1-p_max)²) e verificata
empiricamente su 200.000 bit generati da CSPRNG (H_min misurata ≈0.90,
atteso vicino a 1.0) e su 200.000 bit artificialmente sbilanciati a p=0.9
(H_min misurata ≈0.152, valore teorico atteso −log₂(0.9)≈0.152 — corrispondenza
esatta).
- **Peres Extractor (1992, versione completa)**: verificato con una traccia
manuale bit-per-bit su un input di 10 bit; verificata la conservazione della
massa su decine di prove casuali; verificato che l'efficienza scali
correttamente con il bias della sorgente (≈94% su input equo, ≈44% su input
fortemente sbilanciato p=0.1).
- **Toeplitz Hashing (GF(2))**: la struttura della matrice è stata
cross-validata contro una seconda implementazione scritta con un percorso di
codice indipendente su 9 combinazioni di dimensioni blocco/lunghezza — output
identico bit per bit in tutti i casi.
- **4 test NIST SP 800-22** (Monobit, Block Frequency, Runs, Longest Run):
comportamento verificato corretto sia su 100.000 bit di rumore reale (tutti
e 4 i test PASSANO) sia su una sequenza costante (Monobit FALLISCE
correttamente).
- **Contabilità del bound LHL**: verificato algebricamente che il margine
residuo non può mai diventare negativo, e confermato su 300 simulazioni
casuali — margine minimo osservato: +45 bit, mai negativo.

### Bug reali trovati e corretti

1. **Filtro saturazione/silenzio non copriva il formato PCM signed.** Il
filtro controllava solo gli estremi in lettura UNSIGNED (`0x0000` e
`0xFFFF...`). Il PCM audio a 16/24/32 bit è quasi sempre codificato in
complemento a due (SIGNED), dove i veri estremi di clipping sono `0x7FFF...`
e `0x8000...`. **Riprodotto**: un buffer di 1000 campioni clippati al
massimo signed veniva rilevato come saturo 0 volte su 1000. **Corretto**: il
filtro controlla ora entrambe le coppie di estremi.

### Incoerenze reali trovate e corrette

2. **Nessun controllo di indipendenza fra le finestre 1/2/3.** "Spettro
Totale" era già escluso dalla vittoria, ma le finestre 1/2/3 (fette temporali
della stessa sorgente) non venivano mai confrontate fra loro per
correlazione. **Corretto**: aggiunto un controllo di correlazione multi-lag
(±8 posizioni) con soglia z=5. Verificato: 0 falsi positivi su 300 simulazioni
Monte Carlo, rilevamento corretto (z≈223) su una copia traslata nota.

### Aggiunte per la robustezza (mancavano completamente)

3. **Suite di autotest all'avvio**, contro vettori ufficiali (SHA-256,
HMAC-SHA256, HKDF), Clopper-Pearson, Peres, Toeplitz, MCV/Collision su
sorgenti deterministiche.

### Restyle grafico (nessuna modifica alla logica)

4. Palette e tipografia sostituite con quelle del tool BIP39 di Ian Coleman
(Bootstrap 3 "stock").

## v1 (versione di partenza, fusione di due varianti)

- Debiasing: ripristinato il Peres Extractor 1992 completo al posto del von
Neumann classico (~95% di efficienza contro il ~25-33%).
- Bug critico corretto nella Collision Estimate (formula precedente
`p_max≈√p_collisione` dimezzava la min-entropia stimata anche su dati
perfettamente casuali).
- MCV: sostituita l'approssimazione di Wald con la funzione beta incompleta
esatta (Clopper-Pearson).
- Corretto un bug di visualizzazione (bitstring troncata a 128 bit a schermo,
mai nel file esportato).
- Ripristinata l'esclusione della finestra "Spettro Totale" dalla competizione
per la vittoria.
- Sostituito SplitMix32 con espansione SHA-256 in counter-mode per il seme
della diagonale Toeplitz.
- Mantenuti da entrambe le versioni: gate obbligatori pre-estrazione,
rapporto di estrazione dinamico per finestra, modalità rigorosa di default,
digest SHA-256 opzionale, tracciamento bit reali/sintetici.
