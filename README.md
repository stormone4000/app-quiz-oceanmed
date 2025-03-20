# App Quiz OceanMed

Applicazione Quiz per OceanMed Sailing School

## Tecnologie Utilizzate

- React + Vite
- TypeScript
- TailwindCSS
- Supabase per il database e l'autenticazione

## Funzionalità Principali

- Gestione video e categorie per gli istruttori
- Sistema di autenticazione
- Monitoraggio dello stato di connessione
- Interfaccia responsive e moderna

## Sviluppo Locale

1. Clona il repository
```bash
git clone https://github.com/stormone4000/app-quiz-oceanmed.git
cd app-quiz-oceanmed
```

2. Installa le dipendenze
```bash
npm install
```

3. Crea un file `.env.local` con le seguenti variabili:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Avvia il server di sviluppo
```bash
npm run dev
```

## Deployment

L'applicazione è configurata per il deployment automatico su Vercel:

- Ogni push sul branch `main` attiva automaticamente un nuovo deployment
- Vercel rileva le modifiche attraverso i webhook di GitHub
- Il processo di build usa la configurazione nel `vercel.json`
- Le variabili d'ambiente sono gestite dal pannello di controllo di Vercel

Per monitorare i deployment:
1. Accedi al [Dashboard Vercel](https://vercel.com/dashboard)
2. Seleziona il progetto app-quiz-oceanmed
3. Vai alla sezione "Deployments"

## Licenza

Tutti i diritti riservati © 2024 OceanMed Sailing School