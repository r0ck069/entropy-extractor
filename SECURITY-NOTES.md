# Principi di sicurezza e di design

Questo file raccoglie i principi che guidano le scelte di design dei tool della
famiglia `EntropyPipeline` / `entropy-extractor` / `entropy-extractor-raw-2photo`
(stesso autore), al di là del changelog build-per-build.

## Principio 1 — Mai inventare bit

Nessuna funzione di espansione dell'output (KDF compresa) deve mai produrre più
bit "sicuri" di quanti ne siano stati realmente estratti da Toeplitz. La
**modalità rigorosa** (default in questo tool) applica esattamente questo
principio: se una finestra produce meno bit del target richiesto, vengono
restituiti solo i bit realmente estratti — l'espansione HKDF opzionale (solo se
la modalità rigorosa è disattivata esplicitamente) è sempre etichettata come
"sintetica" nell'output, mai mescolata silenziosamente ai bit reali.

## Principio 2 — Tetto di emissione indipendente dal bound principale

L'uscita per blocco Toeplitz è il minimo di quattro limiti: (a) il **fattore pratico**
0,85·h, con h stima prudente di min-entropia per bit sui bit grezzi; (b) il **bound del lemma
dell'hash residuo per blocco**, m ≤ TOEPLITZ_IN·h − 2·(k + log₂B), dove ε=2⁻ᵏ è l'errore
totale ammesso sull'uscita della finestra e B il numero di blocchi Toeplitz (ogni blocco ha
ε/B: gli errori dei blocchi si sommano); (c) il **massimo** 0,90·TOEPLITZ_IN; (d) il **tetto di
emissione** ⌊TOEPLITZ_IN/2⌋ = 256 bit per blocco, introdotto dalla v4.0.0-beta1. Il tetto è
aritmeticamente separato dagli altri: non sostituisce il bound LHL, gli affianca una rete di
sicurezza a basso costo, indipendente dalla stessa formula, utile in caso di un eventuale bug
futuro nel calcolo del bound principale.

Il bound per blocco (corretto nella v4.0.0-beta4: prima il margine 2k era sottratto una sola
volta dal totale della finestra) vale sotto ipotesi che il tool non verifica: ogni blocco ha
min-entropia almeno TOEPLITZ_IN·h anche condizionata ai blocchi precedenti (sorgente circa
stazionaria); ai bit in ingresso al Toeplitz (uscita di Peres) si attribuisce la stessa
min-entropia per bit h stimata sui bit grezzi, senza accreditare l'aumento dovuto alla
compressione di Peres (ipotesi prudente, non dimostrata per sorgenti non i.i.d.); il seme è
pseudocasuale (espansione SHA-256), quindi la garanzia è computazionale e non teorica
dell'informazione; la confidenza al 99% dello stimatore aggiunge circa 0,01 alla probabilità di
errore, non inclusa in ε. Il lemma è una condizione sufficiente: non rispettarlo non significa
che l'uscita sia distinguibile dal casuale, ma che la garanzia dichiarata non vale.

## Principio 3 — Le finestre "bonus" (Fusione) non alterano la selezione principale

La card "Fusione" (v4.0.0-beta1) concatena le due finestre spaziali più
performanti quando risultano indipendenti fra loro (già verificato dal
controllo di correlazione multi-lag esistente). È puramente informativa:
il suo risultato non entra mai nel calcolo del punteggio che determina la
finestra "vincente" — un bug in questa funzionalità aggiuntiva non può quindi
mai peggiorare silenziosamente la selezione principale già auditata.

## Principio 4 — Non estendere una funzionalità oltre il contesto per cui è stata calibrata

Le soglie dei gate (`MIN_SOURCE_HMIN_RATE`, `MIN_SOURCE_HMIN_ABS`,
`STRUCTURAL_TTUPLE_GATE_THRESHOLD`, `STRUCTURAL_LRS_GATE_THRESHOLD`) sono
calibrate empiricamente sul flusso LSB sequenziale di questo tool. Per questo
motivo, funzionalità che cambierebbero la distribuzione dei campioni osservati
dai gate (selezione per varianza locale, campionamento da posizioni non
sequenziali) non sono state introdotte senza una ricalibrazione dedicata — vedi
CHANGELOG.md, sezione "Non incluso in questa beta".

## Principio 5 — Trasparenza sui limiti, sempre visibile

Ogni stima statistica deve dichiarare esplicitamente cosa NON è: non è una
certificazione, non sostituisce la batteria completa SP 800-90B/SP 800-22.
Applicato nell'interfaccia (badge, banner brevi) e documentato per esteso in
`AUDIT-NOTES.md`.

## Principio 6 — Un bias forzato per il testing va isolato al bit che conta, non sparso ovunque

Scoperto testando con CSPRNG reale il pulsante "Demo sbilanciata" (v4.0.0-beta2,
vedi CHANGELOG.md per il dettaglio): forzare un bias su OGNI bit di un campione
sintetico fa sì che il filtro saturazione/silenzio scarti proprio i campioni più
sbilanciati (finiscono ai valori estremi), lasciando nel campione superstite un
bias molto più debole di quello impostato — al punto da non attivare più il gate
che si voleva dimostrare. Il bias di test va isolato al solo bit-plane
effettivamente estratto, lasciando tutti gli altri bit uniformemente casuali.
Non è un principio teorico: è stato scoperto per errore mentre si costruiva la
funzionalità, con la prima versione scartata prima di essere pubblicata.

## Principio 7 — Separazione di dominio quando più sorgenti alimentano una funzione di hash

Quando più input distinti vengono concatenati prima di una funzione di hash o
KDF, il confine fra un input e l'altro va reso inequivocabile (tag di dominio o
lunghezza codificata esplicitamente). **Non si applica direttamente a questo
tool**: non esiste una modalità di combinazione multi-sorgente qui (una sola
sorgente file per finestra) — annotato apposta perché se in futuro ne venisse
aggiunta una basata su hash (non sulla concatenazione di bit grezzi come in
EntropyPipeline), questo principio andrebbe applicato esplicitamente a quel
punto.

## Stato di audit di questi principi

I principi 1 e 5 derivano da bug/lezioni già verificati nella storia del
progetto (vedi CHANGELOG.md). I principi 2, 3, 4, 6 e 7 sono **nuovi con la
v4.0.0-beta1/beta2** (il 6 e il 7 sono documentali/di lezione appresa, non
introducono codice proprio) e non sono ancora stati sottoposti allo stesso
livello di verifica indipendente degli altri — vanno controllati esplicitamente
in un audit indipendente (il repository è già pubblico come BETA). Il Principio 2 è stato
corretto nella v4.0.0-beta4 (bound LHL per blocco).
