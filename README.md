# Entropy Extractor — Multi-Finestra (Versione Unificata)

Strumento standalone, offline, a singolo file HTML per estrarre entropia crittografica
da una sorgente grezza unica (dump audio RAW/PCM, video, dump di un TRNG hardware, csv),
analizzandola in **4 finestre** (Primaria / Mediana / Terminale / Spettro Totale) e
selezionando automaticamente quella migliore e statisticamente indipendente.

Pipeline: **estrazione LSB + filtro saturazione/silenzio → debiasing Peres (1992,
versione completa) → Toeplitz Hashing (GF(2)) → stime di min-entropia (MCV +
Collision, Clopper-Pearson 99%) + gate strutturale dedicato (t-Tuple + LRS) + health
test retrospettivi (RCT + APT, SP 800-90B §4.4) → 4 test NIST SP 800-22 → SHA-256 o
SHAKE256 finale opzionale**.

Nessuna dipendenza esterna, nessuna chiamata di rete: tutto avviene in RAM nel browser.

## File incluso

- `entropy-extractor-unified.html` — l'applicazione completa (apribile con doppio
  click, nessuna installazione richiesta).

## Come si usa

1. Apri `entropy-extractor-unified.html` in un browser moderno (Firefox o Chromium).
2. Carica un file sorgente grezzo (RAW/PCM/video/dump TRNG) con **Sorgente grezza**.
3. Imposta il **seed** (intero pubblico — non deve essere segreto, vedi
   documentazione in pagina), i **bit di output desiderati per finestra**, la
   **larghezza campione** della sorgente (8/16/24/32 bit) e l'eventuale **offset
   header** da scartare.
4. Spunta "Sorgente già random" solo se la sorgente è già un output di TRNG/CSPRNG
   (disabilita il filtro saturazione/silenzio, pensato per segnali audio/video grezzi).
5. Lascia attiva la **Modalità rigorosa** (default) per non ricevere mai bit
   sintetici: se una finestra non produce abbastanza bit reali, riceverai solo
   quelli realmente estratti.
6. Premi **AVVIA ANALISI FLUSSO**. Il tool elabora tutte e 4 le finestre, applica i
   gate di sicurezza, calcola i rapporti di estrazione Toeplitz in base alla
   min-entropia realmente misurata, esegue i test NIST e seleziona la finestra
   vincente (indipendente, non fallita).
7. Per la finestra vincente puoi calcolare ed esportare anche il digest SHA-256
   finale a 256 bit.
8. Consulta in ogni momento il pannello **Autotest all'avvio**, che verifica ad
   ogni caricamento la correttezza dell'implementazione contro vettori di test
   ufficiali (SHA-256, HMAC-SHA256, HKDF, Clopper-Pearson, Peres, Toeplitz).

Tutte le assunzioni, i gate obbligatori e il changelog dettagliato delle correzioni
matematiche sono documentati direttamente nella pagina, nel pannello
"DOCUMENTAZIONE E ASSUNZIONI" in alto.

## Cosa NON fa

- Non genera entropia lato browser: le 4 finestre derivano tutte dallo stesso file
  caricato dall'utente.
- In modalità rigorosa (default) non espande mai l'output oltre i bit realmente
  estratti da Toeplitz.
- Non sostituisce l'intera batteria SP 800-90B/800-22: implementa 4 stimatori di
  min-entropia (MCV, Collision, t-Tuple, LRS), 2 health test retrospettivi (RCT, APT)
  e 4 dei 15 test NIST SP 800-22, dichiarati come tali. t-Tuple/LRS operano su un
  campione limitato ai primi 20.000 bit per finestra e fungono da gate dedicato,
  senza incidere sul rapporto di estrazione Toeplitz (vedi CHANGELOG v3 per il perché).

## Requisiti

- Browser moderno con supporto a `crypto.subtle` (Web Crypto API).
- Nessuna connessione di rete richiesta dopo il download del file.

## Stile visivo

Stessa palette colori e tipografia del tool [BIP39 di Ian Coleman](https://github.com/iancoleman/bip39)
(Bootstrap 3 di base): sfondo bianco, testo `#333`, blu primario `#337ab7`, alert
verde/giallo/rosso standard, font `Helvetica Neue/Helvetica/Arial` e monospace
`Menlo/Monaco/Consolas`.

## Audit matematico eseguito prima del rilascio

Prima di qualunque modifica estetica, l'intera logica matematica/crittografica è
stata verificata in modo indipendente (vettori RFC/NIST ufficiali, confronto con
SciPy per Clopper-Pearson, implementazioni indipendenti per il cross-check del
Toeplitz hashing, simulazioni Monte Carlo per il controllo di correlazione).
Il dettaglio completo — cosa è stato verificato, cosa è stato trovato, cosa è
stato corretto — è in `CHANGELOG.md`.

## Licenza

MIT — vedi `LICENSE`.

## Per la raccolta delle sorgenti
APP consigliate per la raccolta dei campioni da processare, RØDE Reporter, sensor logger,
registratore Audio di Hardcoded Joy, RecForge II.

Uno o due telefoni cellulari ,una macchina fotografica che abbia la possibilita' di salvare
le foto in raw, una o meglio due radio FM economiche a batterie, un dado in buone condizioni,
una moneta possibilmente in buone condizioni e bilanciata (da 2 euro esce certificata dalla 
Zecca di Stato) , 8 numeri della tombola, un file zip autocreato offline di qualche mega e 
poi distrutto.

Con il microfono del telefono ed escludendo i filtri in ingresso ,raw ,mono (possibilmente queste
app lo fanno) , gia due o piu' minuti di audio in bar frequentato o di una mensa genera un audio
con tanto materiale difficilmente prevedibile, buono da estrarre. O anche il campionamento dal
sensore del giroscopio o magnetometro o accelerometro in una strada con buche e dossi ,puo' 
esserci imprevedibilita' nei bit estratti. L'importante e' prendere sorgenti grezze campionate 
che fra loro non hanno correlazioni apparenti, il segnale audio di due radio FM a batterie
sintonizzate fuori frequenza, due foto completamente nere fatte in raw tappando l'obiettivo, 
il giroscopio del telefono ed il rumore in un bar o una mensa affollata han ben poco in comune.
Basta che una sola tra le sorgenti scelte abbia "qualita' entropica".
