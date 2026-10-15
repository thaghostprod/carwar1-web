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
- Salva i dati in questo browser (`localStorage`) oppure, con il backend attivo, sul server (condivisi con tutti i visitatori)

## Avvio

### Modalità semplice (solo il tuo browser)

Apri `index.html` nel browser, oppure da questa cartella:

```bash
py -m http.server 8080
```

Gli annunci restano in questo browser (`localStorage`).

### Modalità condivisa (consigliata) — backend Node

Serve Node.js. **Nessuna dipendenza da installare.**

```bash
node server.js
```

Poi apri http://localhost:8080: gli annunci sono salvati sul server in `data/annunci.json`
e visibili a **tutti** i visitatori. Il badge in alto mostra 🌐 quando sei connesso al server.

Variabili d'ambiente:

| Variabile | Descrizione | Default |
|---|---|---|
| `PORT` | porta HTTP | `8080` |
| `HOST` | interfaccia di ascolto | `0.0.0.0` |
| `CAR_WARS_TOKEN` | password richiesta per modificare gli annunci | *(vuota = scritture aperte)* |

Esempio protetto da password:

```bash
PORT=8080 CAR_WARS_TOKEN=la-mia-password node server.js
```

Con `CAR_WARS_TOKEN` impostato, per salvare gli annunci inserisci la stessa password in
**Gestione & Import → Server & accesso**.

## API del backend

| Metodo | Percorso | Descrizione |
|---|---|---|
| `GET` | `/api/health` | stato del servizio |
| `GET` | `/api/listings` | elenco annunci |
| `PUT` | `/api/listings` | sostituisce l'elenco (richiede password) |
| `POST` | `/api/listings` | inserisce/aggiorna un annuncio (richiede password) |
| `DELETE` | `/api/listings/:id` | elimina un annuncio (richiede password) |
| `GET` | `/api/config` | dati concessionaria |
| `PUT` | `/api/config` | salva dati concessionaria (richiede password) |

La password va inviata nell'header `x-admin-token`.

## Import / Export

CSV di esempio: `esempi/annunci.csv`

Campi: `id,title,brand,model,year,price,km,fuel,transmission,city,image,source,description`

Il parser CSV gestisce campi tra virgolette con virgole e doppi apici interni.

### Alternativa senza backend

Se non vuoi avviare il server, dalla sezione *Gestione & Import* scarica **data.js**
e sostituisci il file `js/data.js` del sito: il catalogo diventa permanente per tutti.

Usa solo annunci di cui hai i diritti (auto tue, concessionaria, feed API autorizzato). Non copiare i contenuti di portali terzi.

## Test

```bash
node --check server.js
node --check js/app.js
node --check js/store.js
```


