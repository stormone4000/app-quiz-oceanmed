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

L'applicazione è configurata per il deployment su Vercel. Il deployment avviene automaticamente ad ogni push sul branch main.

## Licenza

Tutti i diritti riservati © 2024 OceanMed Sailing School