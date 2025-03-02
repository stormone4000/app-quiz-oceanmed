# App Quiz - Patente Nautica

Applicazione per la gestione di quiz per la patente nautica.

## Configurazione

### Prerequisiti
- Node.js (versione 16 o superiore)
- npm o yarn

### Installazione
1. Clona il repository
2. Installa le dipendenze:
```bash
npm install
# oppure
yarn install
```

### Configurazione delle variabili d'ambiente
Crea un file `.env` nella root del progetto con le seguenti variabili:

```
DOMAIN=https://patente.oceanmedsailing.com
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
PORT=3333

# Supabase Remote
VITE_SUPABASE_URL=https://uqutbomzymeklyowfewp.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Chiave di servizio per operazioni amministrative
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Utilizzo del database remoto

L'applicazione è configurata per utilizzare il database remoto Supabase. Non è necessario importare i dati localmente.

### Test della connessione al database remoto

Per verificare che la connessione al database remoto funzioni correttamente, esegui:

```bash
node src/scripts/testRemoteConnection.js
```

Questo script verificherà la connessione al database remoto e mostrerà alcune informazioni di base sulle tabelle presenti.

## Struttura del database

Il database contiene le seguenti tabelle principali:

- **quiz_types**: Tipi di quiz disponibili (es. Modulo di Apprendimento, Esame Standardizzato)
- **quiz_templates**: Modelli di quiz configurati nel sistema
- **questions**: Domande disponibili per i quiz
- **quiz_questions**: Associazioni tra domande e quiz
- **subscriptions**: Abbonamenti degli utenti

## Avvio dell'applicazione

Per avviare l'applicazione in modalità sviluppo:

```bash
npm run dev
# oppure
yarn dev
```

Per compilare l'applicazione per la produzione:

```bash
npm run build
# oppure
yarn build
```

## Script di utilità

- `src/scripts/testRemoteConnection.js`: Verifica la connessione al database remoto
- `src/scripts/importQuizQuestions.js`: Importa domande dei quiz nel database

## Supporto

Per problemi o domande, contattare il team di sviluppo.

## Funzionalità Principali

- **Gestione Utenti**: Sistema completo di autenticazione e gestione dei ruoli utente
- **Quiz Interattivi**: Creazione e partecipazione a quiz con domande a risposta multipla
- **Video Lezioni**: Visualizzazione di video lezioni organizzate per categorie
- **Dashboard Statistiche**: Monitoraggio delle attività e dei progressi degli utenti
- **Interfaccia Responsive**: Design adattivo per dispositivi desktop e mobili

## Funzioni RPC Personalizzate

L'applicazione utilizza diverse funzioni RPC personalizzate per migliorare l'accesso ai dati:

- **get_all_users()**: Recupera tutti gli utenti del sistema (solo per amministratori)
- **get_dashboard_stats()**: Ottiene statistiche aggregate per la dashboard
- **get_all_videos()**: Recupera tutte le categorie video e i video associati (per amministratori e istruttori)
- **get_student_videos()**: Recupera solo le categorie e i video pubblici (per studenti)

Queste funzioni RPC sono progettate per bypassare le policy RLS (Row Level Security) quando necessario, garantendo al contempo la sicurezza dei dati.

## Connessione a Supabase

// ... existing code ... 