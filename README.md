# Car Wars

Sito vetrina per **annunci auto** che importi tu (JSON o CSV) o inserisci a mano, e ripubblichi sulla tua pagina.

## Cosa fa

### Vetrina
- Griglia filtrabile con ricerca libera, **marca, carburante, cambio, prezzo max, km max, anno**
- **Ordinamento** (prezzo, anno, km, nome) e contatore risultati in tempo reale
- **Preferiti** (♥) salvati nel browser + filtro "Solo preferiti"
- Statistiche rapide: numero auto, prezzo medio, preferiti
- Scheda auto con **galleria fotografica**, specifiche tecniche, descrizione e **annunci simili**

### Scheda annuncio & contatti
- Pulsanti **WhatsApp**, **Chiama ora**, **Invia Email** (precompilati con i dati dell'auto)
- **Form richiesta informazioni / Test Drive**
- Condividi link dell'annuncio (copia negli appunti)
- Modifica / Elimina annuncio direttamente dalla scheda

### Gestione (sezione "Gestione & Import")
- **Form completo** per creare/modificare un annuncio senza scrivere JSON/CSV
- **Import** da file o testo incollato, con modalità *Unisci/Aggiorna* oppure *Sostituisci tutto*
- **Export 1-click**: JSON, CSV e `data.js` (pronto da sostituire in `js/data.js`)
- **Dati concessionaria** configurabili (nome, telefono, WhatsApp, email, indirizzo)
- **Tabella inventario** con azioni rapide Vedi / Modifica / Elimina
- Salva i dati in questo browser (`localStorage`)

## Avvio

Apri `index.html` nel browser, oppure da questa cartella:

```powershell
py -m http.server 8080
```

Poi vai su http://localhost:8080

## Import / Export

CSV di esempio: `esempi/annunci.csv`

Campi: `id,title,brand,model,year,price,km,fuel,transmission,city,image,source,description`

Il parser CSV gestisce campi tra virgolette con virgole e doppi apici interni.

### Pubblicare gli annunci per tutti i visitatori

I dati inseriti restano nel tuo browser. Per renderli visibili a tutti, dalla sezione
*Gestione & Import* scarica **data.js** e sostituisci il file `js/data.js` del sito.

Usa solo annunci di cui hai i diritti (auto tue, concessionaria, feed API autorizzato). Non copiare i contenuti di portali terzi.

## Test

Le funzioni di parsing/export sono testabili con Node:

```bash
node --check js/app.js
```

