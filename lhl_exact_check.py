#!/usr/bin/env python3
"""
Verifica numerica ESATTA del Leftover Hash Lemma per famiglie Toeplitz piccole, con la stessa
indicizzazione di entropy-extractor-unified.html (uscita j = XOR_i x_i & diag[i-j+(m-1)]).
Richiede numpy. Uso:  python3 lhl_exact_check.py
Esito: codice di uscita 0 se tutti i casi rispettano il bound, 1 altrimenti.
Cosa mostra: per un blocco, la distanza statistica (SD) esatta, mediata su TUTTE le chiavi, è
<= 1/2 * sqrt(2^(m-t)); per due blocchi con chiave a finestra scorrevole (come nel codice), la SD
congiunta (S, Y1, Y2) è <= 2 volte quella di un blocco. Non è una prova per le dimensioni reali
(512 bit): è un controllo che la forma del bound e l'argomento ibrido valgano per questa struttura.
"""
import math, sys
import numpy as np

rng = np.random.default_rng(12345)

def key_bits(nbits):
    k = np.arange(2 ** nbits, dtype=np.int64)
    return ((k[:, None] >> np.arange(nbits)[None, :]) & 1).astype(np.int64)

def set_bits(vals, n):
    return ((np.array(vals)[:, None] >> np.arange(n)[None, :]) & 1).astype(np.int64)

def toeplitz_out(X, diag, n, m):
    ys = []
    for j in range(m):
        idx = np.array([i - j + (m - 1) for i in range(n)])
        ys.append((X @ diag[:, idx].T) % 2)
    y = np.zeros_like(ys[0])
    for j in range(m):
        y = y | (ys[j] << j)
    return y

def sd_single(n, m, A):
    X = set_bits(A, n); Y = toeplitz_out(X, key_bits(n + m - 1), n, m)
    tot = 0.0
    for k in range(Y.shape[1]):
        p = np.bincount(Y[:, k], minlength=2 ** m) / len(A)
        tot += 0.5 * np.abs(p - 2.0 ** -m).sum()
    return tot / Y.shape[1]

def sd_two_blocks(n, m, A):
    S = key_bits(n + 2 * m - 1)
    d1 = S[:, : n + m - 1]; d2 = S[:, m: m + n + m - 1]
    X = set_bits(A, n)
    Y1 = toeplitz_out(X, d1, n, m); Y2 = toeplitz_out(X, d2, n, m)
    tot = 0.0; a = len(A)
    for k in range(S.shape[0]):
        c1 = np.bincount(Y1[:, k], minlength=2 ** m) / a
        c2 = np.bincount(Y2[:, k], minlength=2 ** m) / a
        tot += 0.5 * np.abs(np.outer(c1, c2) - 2.0 ** (-2 * m)).sum()
    return tot / S.shape[0]

def make_sets(n, t):
    return {'sottospazio-prime-t-coord': list(range(2 ** t)),
            'sottospazio-ultime-t-coord': [v << (n - t) for v in range(2 ** t)],
            'casuale': list(rng.choice(2 ** n, size=2 ** t, replace=False))}

def main():
    bad = 0
    print("== TEST 1: un blocco, SD esatta mediata su tutte le chiavi, contro 1/2*sqrt(2^(m-t))")
    w1 = 0.0; c1 = 0
    for n, m, t in [(10,3,5),(10,4,6),(10,4,8),(10,5,7),(10,2,4),(11,3,6),(11,5,8)]:
        for name, A in make_sets(n, t).items():
            sd = sd_single(n, m, A); bound = 0.5 * math.sqrt(2.0 ** (m - t)); c1 += 1
            w1 = max(w1, sd / bound)
            if sd > bound + 1e-12:
                bad += 1; print("VIOLATO", n, m, t, name, sd, bound)
    print(f"   casi: {c1}, rapporto massimo SD/bound = {w1:.3f}")
    print("== TEST 2: due blocchi con chiave a finestra scorrevole, SD esatta del congiunto, contro 2*eps_blocco")
    w2 = 0.0; c2 = 0
    for n, m, t in [(8,2,5),(8,2,6),(8,3,6),(9,2,6),(9,3,7)]:
        for name, A in make_sets(n, t).items():
            sd = sd_two_blocks(n, m, A); bound = 2 * 0.5 * math.sqrt(2.0 ** (m - t)); c2 += 1
            w2 = max(w2, sd / bound)
            if sd > bound + 1e-12:
                bad += 1; print("VIOLATO", n, m, t, name, sd, bound)
    print(f"   casi: {c2}, rapporto massimo SD/bound = {w2:.3f}")
    print("lhl_exact_check: " + ("TUTTO OK" if bad == 0 else f"{bad} VIOLAZIONI"))
    return 0 if bad == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
