# Changelog

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

1. **t-Tuple/LRS limitati a un campione di 20.000 bit per finestra**
   (`TTUPLE_LRS_SAMPLE_CAP`), per restare entro un tempo di calcolo ragionevole.
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
  soprattutto, confrontato con il calcolo di riferimento di **SciPy**
  (`scipy.stats.beta.ppf`) su più combinazioni di parametri — corrispondenza
  esatta a 12 cifre significative.
- **Collision Estimate corretta** (`p_max=[1+√(2·p_coll-1)]/2`): riprodotta
  analiticamente (dalla relazione p_coll = p_max² + (1-p_max)²) e verificata
  empiricamente su 200.000 bit generati da CSPRNG (H_min misurata ≈0.90,
  atteso vicino a 1.0) e su 200.000 bit artificialmente sbilanciati a p=0.9
  (H_min misurata ≈0.152, valore teorico atteso −log₂(0.9)≈0.152 — corrispondenza
  esatta).
- **Peres Extractor (1992, versione completa)**: verificato con una traccia
  manuale bit-per-bit su un input di 10 bit (l'output prodotto dal codice
  corrisponde esattamente alla derivazione manuale della costruzione ricorsiva
  Y ∪ Peres(C) ∪ Peres(Z)); verificata la conservazione della massa (l'output
  non supera mai l'input) su decine di prove casuali; verificato che
  l'efficienza scali correttamente con il bias della sorgente (≈94% su input
  equo, ≈44% su input fortemente sbilanciato p=0.1 — nella direzione attesa e
  con margine ampio).
- **Toeplitz Hashing (GF(2))**: la struttura della matrice (diagonale
  `T[j][i]=diag[i-j+(m-1)]`) è stata cross-validata contro una seconda
  implementazione scritta con un percorso di codice indipendente (moltiplicazione
  invece di AND bit a bit, ciclo di accumulo separato) su 9 combinazioni di
  dimensioni blocco/lunghezza — output identico bit per bit in tutti i casi.
- **4 test NIST SP 800-22** (Monobit, Block Frequency, Runs, Longest Run):
  comportamento verificato corretto sia su 100.000 bit di rumore reale (tutti
  e 4 i test PASSANO, p-value nell'intervallo atteso) sia su una sequenza
  costante (il test Monobit FALLISCE correttamente).
- **Contabilità del bound LHL** (rapporto di estrazione Toeplitz derivato dalla
  min-entropia misurata, con margine di sicurezza 2×40=80 bit): verificato
  algebricamente che il margine residuo rispetto al bound non può mai diventare
  negativo, e confermato su 300 simulazioni casuali (lunghezza e bias variabili)
  — margine minimo osservato: +45 bit, mai negativo.

### Bug reali trovati e corretti

1. **Filtro saturazione/silenzio non copriva il formato PCM signed.**
   Il filtro (pensato per scartare campioni "muti" o "saturi" prima
   dell'estrazione dei bit) controllava solo gli estremi in lettura UNSIGNED
   (`0x0000` e `0xFFFF...`). Il PCM audio a 16/24/32 bit — cioè esattamente il
   formato indicato come predefinito dal selettore "16 bit (2 byte, PCM
   standard)" — è quasi sempre codificato in complemento a due (SIGNED), dove i
   veri estremi di clipping sono `0x7FFF...` (massimo positivo) e `0x8000...`
   (minimo negativo), diversi da quelli controllati.
   **Riprodotto concretamente**: un buffer di 1000 campioni a 16 bit tutti
   clippati al valore signed massimo (`0x7FFF`) veniva rilevato come saturo
   **0 volte su 1000** — l'intero segmento (con LSB costante, quindi privo di
   ogni entropia) passava indisturbato nella pipeline come se fosse rumore
   valido.
   **Corretto**: il filtro ora controlla entrambe le coppie di estremi
   (unsigned: 0 / 2⁸ʷ−1; signed: 2⁸ʷ⁻¹−1 / 2⁸ʷ⁻¹), senza bisogno di sapere a
   priori quale convenzione usi la sorgente caricata. Verificato che lo stesso
   buffer di test venga ora rilevato come saturo **1000 volte su 1000**.

### Incoerenze reali trovate e corrette

2. **Nessun controllo di indipendenza fra le finestre 1/2/3.** La finestra
   "Spettro Totale" (unione di 1+2+3) era già correttamente esclusa dalla
   vittoria perché non indipendente per costruzione — ma le finestre
   1 (Primaria), 2 (Mediana) e 3 (Terminale) sono comunque tre **fette
   temporali della stessa identica sorgente**, non fonti fisicamente separate,
   e nulla verificava se fossero a loro volta correlate fra loro (es. un
   pattern periodico di rete, un loop nel file audio, un drift strumentale).
   Una finestra "vincente" avrebbe potuto in teoria essere una copia
   quasi-identica (magari sfasata) di un'altra, pur superando i test NIST sul
   proprio output — un'incoerenza rispetto all'obiettivo dichiarato di
   selezionare una finestra genuinamente indipendente.
   **Corretto**: aggiunto un controllo di correlazione multi-lag (±8 posizioni)
   sui bit LSB grezzi delle finestre 1/2/3, basato su uno z-score asintotico
   (sotto l'ipotesi nulla di indipendenza, il prodotto scalare dei bit mappati
   in ±1 ha media 0 e varianza pari al numero di campioni sovrapposti). Soglia
   z=5, con margine di sicurezza ampio contro i falsi positivi anche
   considerando i 17 lag testati per coppia.
   **Test**: 0 falsi positivi su 300 simulazioni Monte Carlo con coppie di
   sequenze indipendenti; rilevamento corretto (z≈223, ben oltre soglia) su
   una copia traslata nota di una sequenza con se stessa. Le finestre
   correlate vengono escluse dalla competizione per la vittoria; i loro dati
   restano comunque visibili in pagina per trasparenza.

### Aggiunte per la robustezza (mancavano completamente)

3. **Suite di autotest all'avvio.** La versione di partenza non includeva
   alcuna verifica automatica incorporata: tutte le affermazioni di
   correttezza nel changelog erano descrittive ma non verificabili dalla
   pagina stessa. Aggiunto un pannello "Autotest all'avvio" che esegue, ad
   ogni caricamento: vettori di test ufficiali per SHA-256 (nativo e JS puro),
   HMAC-SHA256 (RFC 4231), HKDF (RFC 5869); auto-consistenza e valore di
   riferimento noto di Clopper-Pearson; conservazione della massa ed
   efficienza minima attesa del Peres Extractor su sorgenti deterministiche
   (generate da un flusso SHA-256 in counter-mode con seed fisso, per
   riproducibilità); coerenza del Toeplitz hashing contro una seconda
   implementazione indipendente; coerenza delle stime MCV/Collision su
   sorgenti deterministiche note (equa e sbilanciata). Se un autotest fallisse
   in futuro (es. dopo una modifica), la pagina lo segnala chiaramente come
   possibile regressione.

### Restyle grafico (nessuna modifica alla logica)

4. **Palette colori e tipografia** sostituite con quelle del tool BIP39 di Ian
   Coleman (Bootstrap 3 "stock"): sfondo bianco al posto del tema scuro
   "cyberpunk" originale, testo `#333333`, colore primario blu `#337ab7`
   (pulsanti, link, stato), alert verde/giallo/rosso standard Bootstrap per
   esito positivo/avviso/fallimento, font `Helvetica Neue/Helvetica/Arial` per
   il testo e `Menlo/Monaco/Consolas` per gli elementi monospazio (bitstring,
   log, output). Nessuna variabile di colore hard-coded è stata lasciata dal
   tema precedente.

## v1 (versione di partenza, fusione di due varianti)

- Debiasing: ripristinato il Peres Extractor 1992 completo (ricicla
  ricorsivamente sia l'indicatore di coppia C sia il valore comune Z) al posto
  del von Neumann classico usato da una delle due versioni di partenza
  (~95% di efficienza contro il ~25-33%).
- Bug critico corretto nella Collision Estimate (formula precedente
  `p_max≈√p_collisione` dimezzava la min-entropia stimata anche su dati
  perfettamente casuali).
- MCV: sostituita l'approssimazione di Wald con la funzione beta incompleta
  esatta (Clopper-Pearson).
- Corretto un bug di visualizzazione (bitstring troncata a 128 bit a schermo,
  mai nel file esportato).
- Ripristinata l'esclusione della finestra "Spettro Totale" dalla competizione
  per la vittoria (non è un campione statisticamente indipendente).
- Sostituito SplitMix32 (stato interno di soli 32 bit) con espansione SHA-256
  in counter-mode per il seme della diagonale Toeplitz.
- Mantenuti da entrambe le versioni: gate obbligatori pre-estrazione,
  rapporto di estrazione dinamico per finestra, modalità rigorosa di default,
  digest SHA-256 opzionale, tracciamento bit reali/sintetici.
