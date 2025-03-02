# App Quiz OceanMed Sailing - Documentazione Generale

## Panoramica dell'Applicazione

L'App Quiz è una piattaforma educativa completa progettata per la formazione nel settore della navigazione. Consente la creazione, gestione e somministrazione di diversi tipi di quiz e moduli di apprendimento attraverso un'interfaccia intuitiva e moderna.

## Ruoli Utente

### Amministratore Master
- Gestione completa di tutti i quiz nel sistema
- Visualizzazione e modifica di qualsiasi quiz, indipendentemente da chi l'ha creato
- Gestione degli utenti e assegnazione dei ruoli
- Accesso alle statistiche e ai report di utilizzo
- Possibilità di rendere pubblici o privati i quiz creati da qualsiasi utente

### Istruttore
- Creazione e gestione dei propri quiz
- Possibilità di rendere pubblici o privati i propri quiz
- Assegnazione di quiz agli studenti
- Visualizzazione dei risultati e delle statistiche dei propri quiz
- Modifica e eliminazione solo dei propri quiz

### Studente
- Partecipazione ai quiz assegnati
- Visualizzazione dei propri risultati e progressi
- Accesso ai moduli di apprendimento pubblici
- Partecipazione a sessioni interattive tramite codice PIN

## Tipi di Quiz

### Quiz di Esame (exam)
- Valutazioni formali con punteggio
- Tempo limitato per il completamento
- Possono essere assegnati a studenti specifici
- Risultati dettagliati e feedback immediato

### Moduli di Apprendimento (learning)
- Focus sull'acquisizione di conoscenze
- Consentono di ripetere le domande fino al padroneggiamento
- Forniscono spiegazioni dettagliate per ogni risposta
- Progettati per l'auto-apprendimento

### Quiz Interattivi (interactive)
- Sessioni live gestite da un istruttore
- Gli studenti partecipano in tempo reale usando un codice PIN
- Leaderboard in tempo reale per incentivare la competizione
- Ideali per sessioni di gruppo e verifiche rapide delle conoscenze

## Funzionalità Principali

### Gestione Quiz
- Creazione di nuovi quiz con editor intuitivo
- Aggiunta di domande a scelta multipla con possibilità di caricare immagini
- Personalizzazione di icone, colori e categorie
- Impostazione di tempi e modalità di completamento

### Quiz Live
- Creazione di sessioni interattive
- Generazione automatica di codici PIN per l'accesso
- Monitoraggio in tempo reale della partecipazione
- Visualizzazione dei risultati immediati

### Assegnazione Quiz
- Selezione di studenti specifici per l'assegnazione
- Impostazione di date di scadenza
- Notifiche automatiche agli studenti
- Tracciamento del completamento

### Analisi e Statistiche
- Dashboard con panoramica dei risultati
- Grafici di performance per studenti e classi
- Identificazione delle domande più difficili
- Monitoraggio del progresso nel tempo

## Struttura Tecnica del Database

### Tabelle Principali
- `quiz_templates`: Contiene i modelli di quiz standard (esame e apprendimento)
- `interactive_quiz_templates`: Contiene i modelli di quiz interattivi
- `quiz_questions`: Domande associate ai quiz standard
- `interactive_quiz_questions`: Domande associate ai quiz interattivi
- `live_quiz_sessions`: Sessioni live di quiz interattivi
- `live_quiz_participants`: Partecipanti alle sessioni interattive
- `live_quiz_results`: Risultati aggregati delle sessioni interattive
- `results`: Risultati individuali dei quiz standard

### Politiche RLS (Row Level Security)
L'applicazione utilizza le politiche di sicurezza a livello di riga di Supabase per proteggere i dati. È necessario configurare correttamente queste politiche per ogni tabella:

#### Tabelle che richiedono politiche RLS:
- `quiz_templates`: 
  - Lettura: tutti gli utenti possono leggere i quiz pubblici, gli utenti possono leggere i propri quiz privati
  - Scrittura: solo il creatore o l'admin master può modificare/eliminare
  
- `interactive_quiz_templates`:
  - Lettura: tutti gli utenti possono leggere i quiz pubblici, gli utenti possono leggere i propri quiz privati
  - Scrittura: solo il creatore o l'admin master può modificare/eliminare

- `quiz_questions` e `interactive_quiz_questions`:
  - Lettura: chiunque può leggere le domande dei quiz a cui ha accesso
  - Scrittura: solo il creatore del quiz o l'admin master può modificare/eliminare

- `results`:
  - Lettura: gli studenti possono leggere solo i propri risultati, gli istruttori possono leggere i risultati dei propri quiz
  - Scrittura: gli studenti possono inserire i propri risultati, nessuna modifica dopo l'inserimento

- `live_quiz_sessions`:
  - Lettura: l'host può leggere le proprie sessioni, i partecipanti possono leggere le sessioni a cui partecipano
  - Scrittura: solo l'host può creare/modificare una sessione

- `live_quiz_participants`:
  - Lettura: l'host può leggere tutti i partecipanti della propria sessione, i partecipanti possono leggere solo i propri dati
  - Scrittura: partecipanti possono inserire/modificare solo i propri dati

#### Problemi comuni RLS:
- Errore nel salvare i risultati del quiz: potrebbe essere dovuto alla mancanza di una politica RLS che consenta agli studenti di inserire dati nella tabella `results`
- Errore nel partecipare a una sessione interattiva: potrebbe essere dovuto alla mancanza di una politica RLS per la tabella `live_quiz_participants`

## Flusso di Lavoro

### Creazione Quiz
1. L'istruttore seleziona il tipo di quiz da creare
2. Compila le informazioni di base (titolo, descrizione, categoria)
3. Aggiunge domande, opzioni e risposte corrette
4. Può caricare immagini per illustrare le domande
5. Salva il quiz e sceglie se renderlo pubblico o privato

### Sessione Quiz Interattivo
1. L'istruttore crea una sessione da un quiz interattivo
2. Il sistema genera un codice PIN univoco
3. Gli studenti accedono utilizzando il codice PIN
4. L'istruttore avvia il quiz quando tutti sono pronti
5. Gli studenti rispondono alle domande in tempo reale
6. La leaderboard mostra i risultati in diretta
7. L'istruttore può terminare la sessione in qualsiasi momento

### Assegnazione e Completamento Quiz Standard
1. L'istruttore seleziona un quiz da assegnare
2. Sceglie gli studenti e imposta una scadenza
3. Gli studenti ricevono notifica dell'assegnazione
4. Completano il quiz entro la scadenza
5. I risultati vengono salvati automaticamente
6. L'istruttore può visualizzare statistiche e performance

## Note Tecniche
- L'applicazione è sviluppata con React e TypeScript
- Utilizza Supabase come backend per database e autenticazione
- Implementa Row Level Security per la protezione dei dati
- Il design responsive funziona su desktop e dispositivi mobili
- Utilizza TailwindCSS per lo styling e l'interfaccia utente
- Chart.js per la visualizzazione dei grafici e delle statistiche

## Flusso di Sviluppo
- **Repository GitHub**: Il codice sorgente è ospitato su GitHub (https://github.com/stormone4000/globalquiz)
- **Deploy Automatico**: Utilizziamo Vercel per il deploy automatico dell'applicazione
  - Ogni push al branch main attiva automaticamente un nuovo deploy
  - L'applicazione è accessibile online all'URL fornito da Vercel
- **Database Remoto**: Utilizziamo un'istanza Supabase remota per il database
  - Tutte le modifiche SQL vengono applicate direttamente al database di produzione
  - Non è necessario effettuare migrazioni separate

### Processo di Sviluppo Completo
1. **Sviluppo Locale**
   ```bash
   # Avvia il server di sviluppo locale
   npm run dev
   ```
   - Modifica i file nel tuo editor preferito
   - Testa l'applicazione all'indirizzo http://localhost:5173
   - Verifica che le modifiche funzionino correttamente

2. **Caricamento su GitHub**
   ```bash
   # Verifica quali file sono stati modificati
   git status
   
   # Aggiungi tutti i file modificati
   git add .
   
   # Crea un commit con un messaggio descrittivo
   git commit -m "Descrizione delle modifiche effettuate"
   
   # Carica le modifiche su GitHub
   git push
   ```

3. **Deploy Automatico su Vercel**
   - Vercel rileva automaticamente le modifiche al branch main
   - Inizia il processo di build utilizzando la configurazione Vite
   - Esegue il deploy dell'applicazione aggiornata
   - L'applicazione è accessibile all'URL: https://globalquiz.vercel.app

4. **Verifica dell'Applicazione Online**
   - Visita l'URL dell'applicazione su Vercel
   - Controlla che le modifiche siano state applicate correttamente
   - Testa le funzionalità in ambiente di produzione

### Configurazione Vercel e Supabase

Per garantire che Vercel utilizzi il database Supabase corretto durante il deploy, abbiamo configurato le seguenti impostazioni:

1. **File `.env.local`**
   - Questo file contiene le variabili d'ambiente necessarie per la connessione a Supabase
   - È incluso nel repository (non ignorato da .gitignore) in modo che Vercel possa accedervi
   - Contiene le credenziali per il database Supabase con ID: `uqutbomzymeklyowfewp`

2. **Variabili d'ambiente su Vercel**
   - Le stesse variabili sono configurate anche nel pannello di controllo di Vercel:
     1. Vai su [vercel.com](https://vercel.com) e accedi al tuo account
     2. Seleziona il progetto "globalquiz"
     3. Vai su "Settings" > "Environment Variables"
     4. Verifica che siano presenti le seguenti variabili:
        - `VITE_SUPABASE_URL`: https://uqutbomzymeklyowfewp.supabase.co
        - `VITE_SUPABASE_ANON_KEY`: [chiave anonima]
        - `SUPABASE_SERVICE_KEY`: [chiave di servizio]

3. **Verifica della connessione**
   - L'applicazione esegue automaticamente un test di connessione a Supabase all'avvio
   - Puoi verificare nei log di Vercel che la connessione sia stabilita correttamente
   - In caso di problemi, controlla i log di build e runtime su Vercel

4. **Risoluzione dei problemi**
   - Se la connessione a Supabase fallisce:
     1. Verifica che le variabili d'ambiente siano configurate correttamente
     2. Controlla che il database Supabase sia attivo e accessibile
     3. Verifica che le politiche RLS permettano le operazioni necessarie
     4. Controlla i log di Vercel per messaggi di errore specifici

### Comandi Git Utili
```bash
# Verifica lo stato delle modifiche
git status

# Visualizza le differenze tra i file modificati
git diff

# Scarica eventuali modifiche dal repository remoto
git pull

# Crea un nuovo branch per sviluppare una nuova funzionalità
git checkout -b nome-nuova-funzionalita

# Torna al branch principale
git checkout main

# Unisci le modifiche da un branch al branch principale
git merge nome-nuova-funzionalita
```

### Best Practices
- Effettua commit frequenti con messaggi chiari e descrittivi
- Testa sempre localmente prima di caricare su GitHub
- Utilizza branch separati per funzionalità diverse o complesse
- Controlla sempre il deploy dopo il push per verificare che tutto funzioni
- Documenta le modifiche importanti nel file di documentazione
- Fai sempre backup del database prima di modifiche strutturali

### Gestione del Database Supabase
- Per modifiche al database, applica le query SQL direttamente tramite la console Supabase
- Documenta tutte le modifiche al database nei messaggi di commit o in file SQL dedicati
- Testa le query SQL nella console Supabase prima di implementarle nell'applicazione
- Verifica che le politiche RLS funzionino correttamente dopo ogni modifica

### Vantaggi del Nuovo Flusso
- Ambiente di test identico a quello di produzione
- Nessuna necessità di migrazioni separate
- Facilità di collaborazione tramite GitHub
- Tracciabilità completa delle modifiche
- Deploy rapido e automatico

### Precauzioni
- Effettuare sempre backup del database prima di modifiche importanti
- Testare accuratamente le modifiche SQL prima di applicarle
- Utilizzare branch separati per sviluppare nuove funzionalità
- Documentare tutte le modifiche nei messaggi di commit

## Funzionalità Future Pianificate
- Supporto per domande a risposta aperta
- Funzionalità di importazione/esportazione quiz
- Integrazione con sistemi LMS esterni
- Modalità offline per l'utilizzo senza connessione
- Supporto per quiz in più lingue

## Problemi Noti e Soluzioni
- **Errore nel salvare i risultati del quiz**: ✅ RISOLTO! Il problema era dovuto alla mancanza della colonna `student_email` nella tabella `results` e all'assenza di politiche RLS. È stata aggiunta la colonna e configurate le politiche appropriate.
- **Errore nella visualizzazione dei risultati**: ✅ RISOLTO! È stato riscontrato un problema di relazione tra le tabelle `results` e `quiz_templates`. La query in `api.ts` è stata modificata per utilizzare la tabella `quizzes` invece di `quiz_templates`.
- **Errore "Failed to save quiz result"**: ⚠️ IN ANALISI! Potrebbe essere causato da un problema di tipo dati nella colonna `quiz_id` della tabella `results`. È stato migliorato il logging degli errori per facilitare il debug. Possibili soluzioni:
  - Verificare che il tipo della colonna `quiz_id` in `results` sia compatibile con il tipo della colonna `id` in `quizzes`
  - Controllare che non ci siano vincoli di foreign key che impediscono l'inserimento
  - Assicurarsi che le politiche RLS permettano l'inserimento dei dati
  - Verificare che i dati passati siano validi e del tipo corretto
- **Problemi con i quiz interattivi**: Verificare che tutte le tabelle relative ai quiz interattivi (`interactive_quiz_templates`, `interactive_quiz_questions`, `live_quiz_sessions`, `live_quiz_participants`) abbiano politiche RLS appropriate.
- **Utenti non autorizzati**: Assicurarsi che le informazioni dell'utente (email, ruolo) siano correttamente salvate nel localStorage dopo il login.

---

Questo documento verrà aggiornato regolarmente per riflettere le modifiche e le nuove funzionalità dell'applicazione.

Ultimo aggiornamento: 25 febbraio 2024 