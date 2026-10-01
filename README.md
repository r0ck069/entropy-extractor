# Entropy Extractor — Multi-Finestra (Versione Unificata)

> ⚠ **v4.0.0-beta4 — BETA  pubblicata su GitHub.** Contiene funzionalità
> nuove non ancora sottoposte ad audit indipendente da terzi (sono però state
> verificate con una suite di test rigorosa e reale — vedi `CHANGELOG.md`). Vedi
> `SECURITY-NOTES.md` per i principi di design. Non usare per nulla che conti
> davvero finché non è stata verificata da un revisore indipendente.

Strumento standalone, offline, a singolo file HTML per estrarre entropia crittografica
da una sorgente grezza unica (dump audio RAW/PCM, video, dump di un TRNG hardware, csv),
analizzandola in **4 finestre** (Primaria / Mediana / Terminale / Spettro Totale) e
selezionando automaticamente quella migliore e statisticamente indipendente.

Pipeline: **estrazione a bit-plane selezionabile + filtro saturazione/silenzio →
debiasing Peres (1992, versione completa) → Toeplitz Hashing (GF(2)) → stime di
min-entropia (MCV + Collision, Clopper-Pearson 99%) → 9 test NIST SP 800-22 (8 procedure) →
SHA-256 finale opzionale**.

Nessuna dipendenza esterna, nessuna chiamata di rete: tutto avviene in RAM nel browser.

## File incluso

- `entropy-extractor-unified.html` — l'applicazione completa, build
v4.0.0-beta4 (apribile con doppio click, nessuna installazione richiesta).
- `CHANGELOG.md` — storia delle versioni e delle correzioni, con gli SHA-256 delle build.
- `AUDIT-NOTES.md` — note di audit (punti 1-16).
- `SECURITY-NOTES.md` — principi di sicurezza e di design.
- `extractor_check.js`, `lrs_check.js`, `toeplitz_margin_check.js` — test di regressione in
Node.js delle tre correzioni successive alla v3 (stima dell'entropia prima di Peres, stimatore LRS,
bound LHL per blocco); si lanciano dalla cartella del repository con `node <file>`.
- `lhl_exact_check.py` — verifica numerica esatta del lemma dell'hash residuo su famiglie
Toeplitz piccole (richiede Python 3 e numpy).
- `LICENSE` — licenza MIT.

## Come si usa

1. Apri `entropy-extractor-unified.html` in un browser moderno (Firefox o Chromium).
2. Carica un file sorgente grezzo (RAW/PCM/video/dump TRNG) con **Sorgente grezza**,
oppure premi **Demo sbilanciata (test)** per generare con CSPRNG reale un buffer di
prova che dovrebbe far scattare i gate di sicurezza (non è mai una sorgente reale).
3. Imposta il **seed** (intero pubblico — non deve essere segreto), i **bit di
output desiderati per finestra**, la **larghezza campione** della sorgente
(8/16/24/32 bit), l'eventuale **offset header** da scartare, il **bit-plane**
da estrarre (0=LSB di default), e il **margine di sicurezza LHL** (ε=2⁻ᵏ,
default k=40 — scendere sotto richiede conferma esplicita; ε è l'errore totale ammesso
sull'uscita della finestra, ripartito tra i blocchi Toeplitz come ε/B, vedi `SECURITY-NOTES.md`,
Principio 2).
4. Spunta "Sorgente già random" solo se la sorgente è già un output di TRNG/CSPRNG.
5. Lascia attiva la **Modalità rigorosa** (default) per non ricevere mai bit
sintetici.
6. Premi **AVVIA ANALISI FLUSSO**. Il tool elabora tutte e 4 le finestre, applica i
gate di sicurezza, calcola i rapporti di estrazione Toeplitz (con un tetto di
emissione ⌊input/2⌋ per blocco, oltre al bound LHL per blocco), esegue **9 test NIST SP
800-22** (8 procedure) e seleziona la finestra vincente.
7. Se almeno due fra le finestre spaziali (1/2/3) superano i gate e risultano
indipendenti fra loro, viene mostrata anche una card bonus **"Fusione"**: le
due finestre con min-entropia più alta vengono fuse per concatenazione e
rielaborate come pool unico, per un'analisi puramente informativa/aggiuntiva
(non compete per la selezione principale).
8. Per la finestra vincente puoi calcolare ed esportare anche il digest SHA-256 o
SHAKE256 finale.
9. Consulta in ogni momento il pannello **Autotest all'avvio** e il pannello di
integrità dell'applicazione (hash SHA-256 del codice core).

Il dettaglio completo delle note d'audit storiche è in `AUDIT-NOTES.md`; i
principi di design trasversali sono in `SECURITY-NOTES.md`.

## Cosa NON fa

- Non genera entropia lato browser: le 4 finestre derivano tutte dallo stesso file
caricato dall'utente. Il pulsante "Demo sbilanciata" genera bit deliberatamente
sbilanciati con CSPRNG reale, solo per testare i gate — non simula mai una
sorgente "buona".
- In modalità rigorosa (default) non espande mai l'output oltre i bit realmente
estratti da Toeplitz.
- Non sostituisce l'intera batteria SP 800-90B/800-22: implementa 2 stimatori di
min-entropia di base (MCV, Collision) più due stimatori strutturali dedicati
(t-Tuple, LRS) e **8 delle 15 procedure NIST SP 800-22, in 9 test** (le due Cumulative Sums,
diretta e inversa, contano come una procedura; mancano ancora DFT/Spettrale,
Linear Complexity, Maurer's Universal, Template Matching ×2, Random Excursions
×2), dichiarati come tali.
- **Non offre ancora** (rimandate a una beta successiva, vedi CHANGELOG.md):
combinazione multi-sorgente, selezione bit per varianza locale, campionamento
da posizioni prime, pipeline di confronto diagnostica.

## Requisiti

- Browser moderno con supporto a `crypto.subtle` (Web Crypto API).
- Nessuna connessione di rete richiesta dopo il download del file.

## Stile visivo

Stessa palette colori e tipografia del tool [BIP39 di Ian Coleman](https://github.com/iancoleman/bip39) (Bootstrap 3 di base).

## Audit matematico

La logica matematica/crittografica core (Peres, Toeplitz, SHA-256/HMAC/HKDF, Clopper-Pearson,
MCV/Collision/t-Tuple/LRS, RCT/APT) era stata auditata nella v3 (vettori RFC/NIST ufficiali,
confronto con SciPy, implementazioni indipendenti per il cross-check Toeplitz). Dopo la v3 sono
state corrette tre cose, descritte in `CHANGELOG.md` e `AUDIT-NOTES.md` (punti 14-16): la stima
dell'entropia calcolata prima di Peres e non dopo (26/09/2026, audit indipendente), la lunghezza
di confronto dello stimatore LRS (27/09/2026) e il bound del lemma dell'hash residuo, ora
calcolato per ogni blocco Toeplitz con somma sui blocchi (01/10/2026). Le tre correzioni sono
verificate con script (`extractor_check.js`, `lrs_check.js`, `toeplitz_margin_check.js`,
`lhl_exact_check.py`) e non da un audit indipendente. Le funzionalità nuove della beta sono state
verificate con un harness Node.js end-to-end (vedi CHANGELOG.md) ma non ancora da un audit
indipendente. Il bound del lemma vale sotto ipotesi esplicite (vedi `SECURITY-NOTES.md`,
Principio 2). Dettaglio completo in `CHANGELOG.md` e `AUDIT-NOTES.md`.

## Licenza

MIT — vedi `LICENSE`.

## Per la raccolta delle sorgenti

APP consigliate per la raccolta dei campioni da processare: RØDE Reporter, sensor logger,
registratore Audio di Hardcoded Joy, RecForge II.

Uno o due telefoni cellulari, una macchina fotografica che abbia la possibilità di salvare
le foto in RAW, una o meglio due radio FM economiche a batterie, un dado in buone condizioni,
una moneta possibilmente in buone condizioni e bilanciata (da 2 euro esce certificata dalla
Zecca di Stato), 8 numeri della tombola, un file zip autocreato offline di qualche mega e
poi distrutto.Con il microfono del telefono ed escludendo i filtri in ingresso, raw, mono 
(queste app lo fanno), già due o più minuti di audio in un bar frequentato o in una mensa
genera un audio con tanto materiale difficilmente prevedibile, buono da estrarre. O anche
il campionamento dal sensore del giroscopio o magnetometro o accelerometro in una strada con
buche e dossi, può esserci imprevedibilità nei bit estratti — l'assistente CSV/sensore di
EntropyPipeline (non incluso in questo strumento) è pensato proprio per questo caso d'uso. L'importante è prendere sorgenti
grezze campionate che fra loro non abbiano correlazioni apparenti: il segnale audio di due
radio FM a batterie sintonizzate fuori frequenza, una foto completamente nera fatta in raw
tappando l'obiettivo, un giroscopio e il rumore in un bar o una mensa affollata hanno ben
poco in comune. Basta che una sola tra le sorgenti scelte abbia "qualità entropica", meglio
se presi in autonomia con 2 telefoni diversi ed una reflex.

