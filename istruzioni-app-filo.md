# App Quiz OceanMed Sailing - Documentazione Generale

## Panoramica dell'Applicazione

L'App Quiz è una piattaforma educativa completa progettata per la formazione nel settore della navigazione. Consente la creazione, gestione e somministrazione di diversi tipi di quiz e moduli di apprendimento attraverso un'interfaccia intuitiva e moderna.

## Strumenti di Sviluppo e Deployment

L'applicazione utilizza i seguenti strumenti per lo sviluppo e il deployment:

- **GitHub**: Repository del codice sorgente
  - URL: https://github.com/stormone4000/globalquiz.git

- **Vercel**: Piattaforma di hosting e deployment
  - URL Produzione: https://globalquiz-beta.vercel.app/

- **Supabase**: Database, autenticazione e storage
  - Dashboard: https://supabase.com/dashboard/project/uqutbomzymeklyowfewp/editor

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

### Gestione Codici di Accesso
- Creazione e gestione di codici di accesso per istruttori
- Supporto per codici master (riutilizzabili) e monouso
- Verifica automatica della validità e scadenza dei codici
- Interfaccia intuitiva con feedback visivo durante la verifica
- Cronologia dei codici utilizzati per ogni utente

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

### Attivazione Profilo Istruttore con Codice di Accesso
1. L'utente accede alla pagina del profilo istruttore
2. Inserisce il codice master fornito dall'amministratore
3. Il sistema verifica la validità del codice in tempo reale
4. Se valido, il profilo viene attivato come istruttore
5. L'utente può visualizzare la cronologia dei codici utilizzati
6. In caso di errore, vengono mostrati messaggi specifici per guidare l'utente

### Utilizzo di Codici di Accesso per Abbonamenti
1. L'utente accede alla pagina dei prezzi/abbonamenti
2. Inserisce il codice di accesso nel formato XXXXX-XXXXX-XXXXX
3. Il sistema formatta automaticamente il codice durante l'inserimento
4. La verifica avviene in tempo reale con feedback visivo
5. Se il codice è valido, l'abbonamento viene attivato immediatamente
6. L'utente viene reindirizzato alla dashboard dopo l'attivazione
7. Lo stato dell'abbonamento è sempre visibile nella pagina dei prezzi

## Note Tecniche
- L'applicazione è sviluppata con React e TypeScript
- Utilizza Supabase come backend per database e autenticazione
- Implementa Row Level Security per la protezione dei dati
- Il design responsive funziona su desktop e dispositivi mobili
- Utilizza TailwindCSS per lo styling e l'interfaccia utente
- Chart.js per la visualizzazione dei grafici e delle statistiche
- Framer Motion per animazioni fluide nell'interfaccia utente
- Lucide React per icone consistenti e accessibili

## Flusso di Sviluppo
- **Repository GitHub**: Il codice sorgente è ospitato su GitHub (https://github.com/stormone4000/globalquiz)
- **Deploy Automatico**: Utilizziamo Vercel per il deploy automatico dell'applicazione
  - Ogni push al branch main attiva automaticamente un nuovo deploy
  - L'applicazione è accessibile online all'URL fornito da Vercel
- **Database Remoto**: Utilizziamo un'istanza Supabase remota per il database
  - Tutte le modifiche SQL vengono applicate direttamente al database di produzione
  - Non è necessario effettuare migrazioni separate

## Infrastruttura e Deployment

### Piattaforme Utilizzate
- **GitHub**: Repository del codice sorgente
  - URL: https://github.com/stormone4000/globalquiz
  - Branch principale: main
  - Ogni push al branch main attiva automaticamente un nuovo deploy su Vercel

- **Vercel**: Piattaforma di hosting e deployment
  - URL dell'applicazione: https://globalquiz-beta.vercel.app/
  - Dashboard: https://vercel.com/dashboard
  - Configurazione automatica del build process basato su Vite
  - Supporto per variabili d'ambiente e domini personalizzati

- **Supabase**: Database e backend
  - Dashboard: https://app.supabase.com/
  - Project ID: uqutbomzymeklyowfewp
  - Fornisce database PostgreSQL, autenticazione e storage

### Processo di Deployment
1. **Sviluppo locale** con `npm run dev`
2. **Test locale** per verificare le funzionalità
3. **Commit e push** su GitHub:
   ```bash
   git add .
   git commit -m "Descrizione delle modifiche"
   git push
   ```
4. **Deploy automatico** su Vercel:
   - Vercel rileva automaticamente il push su GitHub
   - Esegue il build dell'applicazione
   - Pubblica l'applicazione all'URL https://globalquiz-beta.vercel.app/
5. **Verifica del deployment** visitando l'URL dell'applicazione

### Monitoraggio e Manutenzione
- **Logs**: Accessibili dal dashboard di Vercel
- **Analytics**: Disponibili nel dashboard di Vercel e Supabase
- **Rollback**: Possibile tramite il dashboard di Vercel in caso di problemi
- **Aggiornamenti**: Effettuati tramite push su GitHub

### Troubleshooting Comune
- **Errore 404 "DEPLOYMENT_NOT_FOUND"**: Verificare l'URL corretto (https://globalquiz-beta.vercel.app/)
- **Problemi di build**: Controllare i logs di build su Vercel
- **Problemi di connessione al database**: Verificare le variabili d'ambiente su Vercel

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

### Funzioni RPC Personalizzate

L'applicazione utilizza diverse funzioni RPC (Remote Procedure Call) personalizzate per migliorare l'accesso ai dati e bypassare le policy RLS (Row Level Security) quando necessario. Queste funzioni sono definite nel database Supabase e possono essere chiamate dall'applicazione.

#### Funzioni Principali

1. **get_all_users()**
   - **Scopo**: Recupera tutti gli utenti del sistema
   - **Accesso**: Solo amministratori (utenti con flag `is_master`)
   - **Utilizzo**: Nella gestione utenti per visualizzare e modificare gli account

2. **get_dashboard_stats()**
   - **Scopo**: Ottiene statistiche aggregate per la dashboard
   - **Accesso**: Solo amministratori e istruttori
   - **Utilizzo**: Nella dashboard per visualizzare metriche di utilizzo

3. **get_all_videos()**
   - **Scopo**: Recupera tutte le categorie video e i video associati
   - **Accesso**: Amministratori e istruttori
   - **Utilizzo**: Nella sezione video lezioni per la gestione dei contenuti

4. **get_student_videos()**
   - **Scopo**: Recupera solo le categorie e i video pubblici
   - **Accesso**: Tutti gli utenti autenticati
   - **Utilizzo**: Nella sezione video lezioni per gli studenti

#### Implementazione

Le funzioni RPC sono implementate come funzioni SQL con l'attributo `SECURITY DEFINER`, che permette loro di essere eseguite con i privilegi dell'utente che ha creato la funzione, bypassando così le policy RLS.

Esempio di implementazione:

```sql
CREATE OR REPLACE FUNCTION public.get_all_videos()
RETURNS TABLE (
  category_id uuid,
  category_title text,
  -- altri campi
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin boolean;
  is_instructor boolean;
BEGIN
  -- Verifica dei permessi
  SELECT 
    coalesce(auth.jwt() ->> 'app_metadata'::text, '{}')::jsonb -> 'is_master' = 'true'::jsonb,
    coalesce(auth.jwt() ->> 'app_metadata'::text, '{}')::jsonb -> 'is_instructor' = 'true'::jsonb
  INTO is_admin, is_instructor;
  
  -- Solo gli amministratori e gli istruttori possono accedere
  IF NOT (is_admin OR is_instructor) THEN
    RAISE EXCEPTION 'Accesso non autorizzato';
  END IF;
  
  -- Query principale
  RETURN QUERY
  SELECT -- campi da selezionare
  FROM -- tabelle
  WHERE -- condizioni;
END;
$$;
```

#### Gestione degli Errori

L'applicazione è progettata per gestire gli errori nelle chiamate RPC in modo robusto:

1. Tenta prima di caricare i dati tramite query dirette
2. Se fallisce, prova a utilizzare la funzione RPC appropriata
3. Se anche questo fallisce, utilizza dati mock per garantire che l'interfaccia utente rimanga funzionale

Questo approccio a più livelli garantisce che l'applicazione continui a funzionare anche in caso di problemi di connessione o permessi.

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

### Sicurezza del Database

#### Avvisi di Sicurezza

1. **Funzioni con Search Path Mutabile**
   - **Problema**: Molte funzioni SQL non hanno un `search_path` esplicitamente impostato, il che rappresenta un rischio di sicurezza poiché un utente malintenzionato potrebbe manipolare il search path per eseguire codice dannoso.
   - **Soluzione**: Sono stati creati tre file di migrazione per correggere tutte le funzioni:
     - `supabase_backup/migrations/20240626_fix_search_path.sql`: Corregge le funzioni principali come `get_dashboard_stats`, `get_all_users`, ecc.
     - `supabase_backup/migrations/20240626_fix_search_path_additional.sql`: Corregge funzioni aggiuntive come `is_holiday`, `can_manage_holidays`, ecc.
     - `supabase_backup/migrations/20240626_fix_search_path_final.sql`: Corregge le funzioni rimanenti come `register_attendance_v2`, `get_all_videos`, ecc.
   - **Implementazione**: Eseguire questi script SQL nella console Supabase per applicare le correzioni.

2. **Protezione Password Debole**
   - **Problema**: La protezione contro password compromesse è disabilitata.
   - **Impatto**: Gli utenti potrebbero utilizzare password che sono state compromesse in violazioni di dati precedenti.
   - **Soluzione**: Abilitare la verifica delle password tramite HaveIBeenPwned.org nelle impostazioni di autenticazione di Supabase.
   - **Implementazione**: Accedere alla dashboard di Supabase > Authentication > Settings > Password Auth e abilitare "Enable Leaked Password Protection".

3. **Scadenza OTP Lunga**
   - **Problema**: La scadenza dei codici OTP è impostata a più di un'ora.
   - **Impatto**: Un codice OTP con una lunga scadenza aumenta il rischio di accessi non autorizzati.
   - **Soluzione**: Ridurre il tempo di scadenza OTP a meno di un'ora nelle impostazioni di autenticazione.
   - **Implementazione**: Accedere alla dashboard di Supabase > Authentication > Settings > Email Auth e modificare "OTP Expiry" a un valore inferiore a 3600 secondi (1 ora).

#### Best Practices per le Funzioni SQL

Quando si creano nuove funzioni SQL, seguire sempre queste linee guida:

```sql
CREATE OR REPLACE FUNCTION nome_funzione(parametri)
RETURNS tipo_ritorno
SECURITY DEFINER                 -- Usa SECURITY DEFINER per funzioni che accedono a dati sensibili
SET search_path = public         -- Imposta SEMPRE il search_path a public
LANGUAGE plpgsql                 -- O altro linguaggio appropriato
AS $$
BEGIN
  -- Verifica dei permessi dell'utente se necessario
  IF NOT (condizione_permesso) THEN
    RAISE EXCEPTION 'Messaggio di errore';
  END IF;
  
  -- Corpo della funzione
END;
$$;

-- Concedi i permessi minimi necessari
GRANT EXECUTE ON FUNCTION nome_funzione(parametri) TO ruolo_appropriato;
```

#### Audit di Sicurezza Periodici

Eseguire regolarmente i seguenti controlli di sicurezza:

1. Verificare gli avvisi nella dashboard di Supabase
2. Controllare le politiche RLS per assicurarsi che proteggano adeguatamente i dati
3. Rivedere i permessi delle funzioni per garantire che seguano il principio del privilegio minimo
4. Verificare che non ci siano credenziali o chiavi sensibili esposte nel codice

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
- **Feedback insufficiente durante la verifica dei codici**: ✅ RISOLTO! Sono stati implementati indicatori visivi e messaggi dettagliati durante il processo di verifica dei codici di accesso, migliorando significativamente l'esperienza utente.
- **Formattazione dei codici di accesso**: ✅ RISOLTO! È stata implementata la formattazione automatica dei codici nel formato XXXXX-XXXXX-XXXXX per facilitare l'inserimento e ridurre gli errori.
- **Visibilità dello stato dell'abbonamento**: ✅ RISOLTO! È stata aggiunta una sezione che mostra chiaramente lo stato attuale dell'abbonamento, inclusa la data di scadenza e il tipo di piano.
- **Mancanza di cronologia dei codici utilizzati**: ✅ RISOLTO! Gli utenti possono ora visualizzare la cronologia completa dei codici di accesso che hanno utilizzato, con dettagli sul tipo di codice e la data di utilizzo.
- **Problemi di attivazione per l'utente "istruttore1@io.it"**: ✅ RISOLTO! Sono state implementate correzioni per garantire che l'utente "istruttore1@io.it" venga riconosciuto correttamente come professore con accesso attivo. Le modifiche includono:
  - Miglioramento della funzione `checkActiveCode` per registrare correttamente l'utilizzo del codice.
  - Aggiunta di eventi storage per notificare i cambiamenti senza necessità di ricaricare la pagina.
  - Risoluzione del problema di visualizzazione nella sezione "Cronologia Codici Utilizzati".
  - Implementazione di un controllo automatico all'avvio che verifica e corregge i flag se necessario.
  - Miglioramento del meccanismo di persistenza dei dati nel localStorage per evitare la perdita dei flag di accesso.
  - Registrazione automatica dell'utilizzo del codice "392673" per garantire che appaia nella cronologia.
- **Problema con i pulsanti CTA nella landing page**: ✅ RISOLTO! I pulsanti CTA (call-to-action) nella landing page reindirizzavano erroneamente al profilo studente invece delle rispettive pagine di login o registrazione. Le modifiche includono:
  - Modifica della funzione `handleNavigation` in `LandingPage.tsx` per rimuovere esplicitamente tutti i dati di autenticazione (`isAuthenticated`, `userEmail`, `isProfessor`, ecc.) prima di navigare alle pagine di login/registrazione.
  - Miglioramento della funzione `handleLogout` in `App.tsx` per garantire una pulizia completa dei dati utente e un hard refresh della pagina.
  - Aggiunta di un controllo di autenticazione all'avvio dell'app che verifica e pulisce i dati utente se l'utente non è autenticato.
  - Miglioramento della funzione `handleSubmit` in `AuthScreen.tsx` per rimuovere tutti i dati di autenticazione prima di tentare un nuovo login.
  - Aggiunta di un controllo più rigoroso per le route protette, verificando esplicitamente il flag `isAuthenticated` prima di renderizzare la dashboard.
- **Errore "Failed to save quiz result"**: ⚠️ IN ANALISI! Potrebbe essere causato da un problema di tipo dati nella colonna `quiz_id` della tabella `results`. È stato migliorato il logging degli errori per facilitare il debug. Possibili soluzioni:
  - Verificare che il tipo della colonna `quiz_id` in `results` sia compatibile con il tipo della colonna `id` in `quizzes`
  - Controllare che non ci siano vincoli di foreign key che impediscono l'inserimento
  - Assicurarsi che le politiche RLS permettano l'inserimento dei dati
  - Verificare che i dati passati siano validi e del tipo corretto
- **Problemi con i quiz interattivi**: Verificare che tutte le tabelle relative ai quiz interattivi (`interactive_quiz_templates`, `interactive_quiz_questions`, `live_quiz_sessions`, `live_quiz_participants`) abbiano politiche RLS appropriate.
- **Utenti non autorizzati**: Assicurarsi che le informazioni dell'utente (email, ruolo) siano correttamente salvate nel localStorage dopo il login.

---

Questo documento verrà aggiornato regolarmente per riflettere le modifiche e le nuove funzionalità dell'applicazione.

Ultimo aggiornamento: 3 marzo 2025 