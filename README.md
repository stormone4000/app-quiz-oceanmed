# GlobalQuiz - App Quiz OceanMed Sailing

Un'applicazione educativa completa per la formazione nel settore della navigazione, che consente la creazione, gestione e somministrazione di diversi tipi di quiz e moduli di apprendimento.

## 🚀 Tecnologie Utilizzate

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Autenticazione, Storage)
- **Deployment**: Vercel
- **Gestione Versioni**: GitHub

## 📋 Prerequisiti

- Node.js (v16 o superiore)
- npm o yarn
- Git

## 🔧 Installazione e Setup

1. **Clona il repository**
   ```bash
   git clone https://github.com/stormone4000/globalquiz.git
   cd globalquiz
   ```

2. **Installa le dipendenze**
   ```bash
   npm install
   ```

3. **Configura le variabili d'ambiente**
   - Il file `.env.local` è già configurato per la connessione a Supabase
   - Per lo sviluppo locale, puoi utilizzare le stesse variabili

4. **Avvia il server di sviluppo**
   ```bash
   npm run dev
   ```

5. **Accedi all'applicazione**
   - Apri il browser e vai a `http://localhost:5173`

## 🔌 Connessione a Supabase

L'applicazione è configurata per connettersi al database Supabase con ID `uqutbomzymeklyowfewp`. La connessione viene gestita automaticamente utilizzando le variabili d'ambiente nel file `.env.local`.

### Test della Connessione

L'applicazione esegue automaticamente un test di connessione a Supabase all'avvio. Puoi verificare nei log della console che la connessione sia stabilita correttamente.

### Risoluzione dei Problemi

Se la connessione a Supabase fallisce:
1. Verifica che le variabili d'ambiente siano configurate correttamente
2. Controlla che il database Supabase sia attivo e accessibile
3. Verifica che le politiche RLS permettano le operazioni necessarie

## 🚢 Deployment

L'applicazione è configurata per il deploy automatico su Vercel. Ogni push al branch `main` attiva automaticamente un nuovo deploy.

### Configurazione Vercel

Le variabili d'ambiente necessarie sono già configurate nel file `.env.local` e vengono automaticamente utilizzate da Vercel durante il deploy.

## 📚 Documentazione

Per una documentazione più dettagliata, consulta il file `istruzioni-app-filo.md` nel repository.

## 👥 Contribuire

1. Fai un fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/nome-feature`)
3. Fai commit delle tue modifiche (`git commit -m 'Aggiungi una nuova feature'`)
4. Fai push al branch (`git push origin feature/nome-feature`)
5. Apri una Pull Request

## 📄 Licenza

Questo progetto è proprietario e riservato. Tutti i diritti sono riservati.

## 📞 Contatti

Per domande o supporto, contatta il team di sviluppo. 