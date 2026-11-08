# Obseg, ciljni deleži in dinamika financiranja javnih univerz

Dean Korošak · Univerza v Mariboru · 7. november 2026 · interno gradivo, pripravljeno za MIZM

Normativni model obsega, članek z dodatkom in predstavitev v treh nivojih. Osnovni scenarij je zakonski okvir ZViS-1 (razvojni steber 10 % v prvem letu obdobja, nato nespremenjen znesek, varovalki 122. in 178. člena), postopni dvig razvojnega stebra pa alternativa, ki je vedno prikazana zraven. Model primerja veljavno delitev po deležih preteklega leta (S0), znižanje ob upadu študijske dejavnosti, ki ga dopuščata 124. in 125. člen, ter predlagani pravili izravnave A in B s politikami preračuna ciljnih deležev. Pokaže tudi, kolikšna dopolnitev okvira bi preprečila znižanje TSF ob začetku obdobja. Za polne univerze preveri, kako sta obseg na študenta in finančni izid odvisna od velikosti univerze in od razpona velikosti v sistemu.

## Vsebina mape

| Datoteka ali mapa | Vsebina |
|---|---|
| `Obseg_ciljni_delezi_dinamika_clanek.pdf` | članek (dva stolpca) z dodatkom: pojmi in oznake, zakonski okvir in izhodišča, teoretična utemeljitev z devetimi trditvami, normativni model, ciljni deleži, dinamika in znižanje ob upadu, razvoj, zasnova, ocenjevanje, rezultati E1–E12, omejitve in naslednje preverjanje |
| `Obseg_ciljni_delezi_dinamika_povzetek.pdf` | kratek povzetek (pet strani) v splošno razumljivem jeziku: kaj je narejeno in kako, kaj pomenijo rezultati za odločanje in kaj sledi |
| `Obseg_ciljni_delezi_dinamika_PRL.pdf` | povzetek v obliki kratkega pisma (štiri strani, dva stolpca): univerze kot delci, ura izravnave, premična past, znižanje ob upadu, velikost in robustnost |
| `Obseg_ciljni_delezi_dinamika_povzetek_PRL.pdf` | kratek povzetek v splošno razumljivem jeziku v obliki pisma (štiri strani, dva stolpca) |
| `predstavitev/nivoji/` | predstavitev: uvod (kaj je narejeno, kaj smo preverili) in trije nivoji (splošna raven 4 drsnice, bolj podrobno 7, podrobno 8; konec mogoč po vsakem nivoju), vse vrednosti relativne: `index.html`, PDF, govorno besedilo s preprostimi razlagami pojmov in slik ter slovarčkom |
| `predstavitev/izvor/` | knjižnica drsnic, ogrodje, slovarček pojmov in skripte za sestavo predstavitve |
| `dokument/` | izvorna koda članka z dodatkom (XeLaTeX); številke, tabele in slike bere iz `koda/out` in `koda/fig_clanek` |
| `koda/` | paket `modelum`, simulacije E0–E12, slike, makri, tabele in 59 preizkusov |

## Simulacije

| | Vsebina |
|---|---|
| E0 | ansambel 4.000 univerz (največja entropija), 1.200 sistemov s 3–10 univerzami, tipične univerze A–E |
| E1 | obseg tipičnega sistema, načini izračuna, lokalna občutljivost (tudi formula MS s povprečnim faktorjem programa, brez INV, FPS 0) |
| E2 | ciljni deleži v ansamblu: linearni približek šuma, fluktuacijsko skaliranje, fluktuacijsko-odzivna zveza, indeksi občutljivosti |
| E3 | umetniški programi in medicina; programi posebnega nacionalnega pomena |
| E4–E7 | dinamika po pravilih v zakonskem in alternativnem okviru, sheme razvojnega stebra z varovalkama in brez njiju, različice okvira, znižanje TSF (stalen znesek razvojnega stebra v obdobju, prag nominalnega znižanja, delež razvojnega stebra 10, 15 in 20 %), enkratna in trajna dopolnitev okvira, ura izravnave, globalna občutljivost, ponazoritveni primer |
| E8 | razvoj univerz: dinamični delci (1.200 univerz × 40 poti); veljavna delitev S0 brez znižanja ob upadu in z njim (U6, U1, U6s), politike P6, P3, P1, P6p, P6r s pravili A in B ter A in B z znižanjem, v obeh okvirih; scenariji na tipičnem sistemu; kompromis med sledenjem in nihanjem |
| E9 | spodbude na dveh ravneh (obseg in sredstva) |
| E10 | susceptibilnost, zanos in preverjanje zunaj vzorca, trije zaostanki in nesimetrija pasti, enoletni pogojni momenti prirastkov s krnjenjem, napovedna pomembnost lastnosti |
| E11 | robustnost: 11 različic generatorja, praga, šokov, začetnih neskladij in okvira, tudi za delitev S0 in znižanje ob upadu |
| E12 | polne univerze in velikost: obseg na študenta na mreži velikosti (750–40.000 študentov) pri treh predpostavkah o portfelju, premija majhnosti pri 14 različicah normativov, sistemi štirih polnih univerz z razponom velikosti 1–30 |

## Zagon

Python 3.10 ali novejši z `numpy`, `scipy`, `matplotlib`, `scikit-learn`; za preizkuse `pytest`.

```
cd koda
python3 run_all.py              # simulacije E0–E12, slike, makri, tabele, preizkusi (okoli 45 minut)
python3 sim/slike_clanek.py     # slike z izrazoslovjem članka v fig_clanek
python3 sim/slike_povzetek.py   # preprosti sliki za povzetek v fig_povzetek
```

Članek: `cd dokument && xelatex Obseg_ciljni_delezi_dinamika_clanek.tex` (trikrat). Povzetek: `cd dokument && xelatex Obseg_ciljni_delezi_dinamika_povzetek.tex` (dvakrat). Pismo: `cd dokument && xelatex Obseg_ciljni_delezi_dinamika_PRL.tex` (trikrat, potreben je razred `revtex4-2`). Povzetek v obliki pisma: `cd dokument && xelatex Obseg_ciljni_delezi_dinamika_povzetek_PRL.tex` (trikrat). Predstavitev: `python3 predstavitev/izvor/gradi_nivoji.py` (po prevodu članka, ker se sklici berejo iz njegove datoteke `.aux`; ogrodje je v `predloga.html`), govorno besedilo pa `python3 predstavitev/izvor/besedilo.py <index.html> <izhod.txt> "<naslov>" "<podnaslov>"`.

Vsi zgledi in simulacije uporabljajo izmišljene podatke.
