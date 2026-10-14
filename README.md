# Car Wars

Sito vetrina per **annunci auto** che importi tu (JSON o CSV) e ripubblichi sulla tua pagina.

## Cosa fa

- Mostra una griglia filtrabile (ricerca, carburante, prezzo, km, anno)
- Apre la scheda di ogni auto
- Importa annunci da file o testo incollato
- Salva i dati in questo browser (`localStorage`)

## Avvio

Apri `index.html` nel browser, oppure da questa cartella:

```powershell
py -m http.server 8080
```

Poi vai su http://localhost:8080

## Import

CSV di esempio: `esempi/annunci.csv`

Campi: `id,title,brand,model,year,price,km,fuel,transmission,city,image,source,description`

Usa solo annunci di cui hai i diritti (auto tue, concessionaria, feed API autorizzato). Non copiare i contenuti di portali terzi.
