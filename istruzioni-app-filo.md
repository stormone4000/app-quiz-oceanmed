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
- Accesso a "Tutti i quiz" nella sidebar per visualizzare l'elenco completo
- Creazione e gestione dei propri quiz (simile all'admin)
- Generazione di codici quiz da distribuire agli studenti
- Accesso a "Gestione Alunni" nella sidebar per monitorare chi ha attivato i codici
- Visualizzazione dei risultati e delle statistiche dei propri quiz
- Modifica e eliminazione solo dei propri quiz
- Possibilità di rendere pubblici o privati i propri quiz

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
- Generazione automatica di codici PIN per ogni sessione
- Possibilità di copiare facilmente il PIN per condividerlo con gli studenti

## Funzionalità Principali

### Gestione Quiz
- Creazione di nuovi quiz con editor intuitivo
- Aggiunta di domande a scelta multipla con possibilità di caricare immagini
- Personalizzazione di icone, colori e categorie
- Impostazione di tempi e modalità di completamento
- Impostazione della visibilità (pubblica o privata) per tutti i tipi di quiz

### Quiz Live
- Creazione di sessioni interattive
- Generazione automatica di codici PIN per l'accesso
- Monitoraggio in tempo reale della partecipazione
- Visualizzazione dei risultati immediati
- Notifica automatica del PIN all'avvio della sessione
- Interfaccia intuitiva per la gestione delle sessioni attive

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
- **Differenziazione dei codici**: I codici per gli studenti hanno il prefisso "QUIZ-" per distinguerli dai codici per gli istruttori
- **Codice master riservato**: Il codice master "55555" è riservato agli amministratori e non è visibile agli istruttori

### Tipi di Codici di Accesso
- **Codici Istruttore**: Utilizzati per attivare gli account istruttore
  - Non hanno prefissi specifici
  - Il codice master "55555" è riservato agli amministratori
  - Visibili solo a chi li ha creati e agli amministratori
  
- **Codici Quiz (QUIZ-xxxx)**: Utilizzati dagli studenti per accedere ai quiz
  - Hanno sempre il prefisso "QUIZ-" seguito da un codice numerico
  - Generati automaticamente dal sistema
  - Possono essere creati da istruttori e amministratori
  - Utilizzati esclusivamente per l'accesso ai quiz, non per l'attivazione di account

### Distinzione tra Codici di Accesso e Codici Quiz

#### Problema risolto
È stata implementata una soluzione per gestire la distinzione tra due sistemi di codici completamente diversi nell'applicazione:

1. **Codici Quiz**: codici collegati direttamente ai quiz nella tabella `quiz_templates`
   - Danno accesso a un quiz specifico identificato dal codice
   - Sono memorizzati nel campo `quiz_code` della tabella `quiz_templates`
   - Utilizzati principalmente per condividere quiz specifici

2. **Codici di Accesso**: codici generali nella tabella `access_codes`
   - Danno accesso generale alla piattaforma
   - Sono memorizzati nella tabella `access_codes` 
   - Utilizzati per attivare abbonamenti o concedere accesso alla piattaforma

#### Soluzione implementata
Per risolvere i problemi di ambiguità e garantire la compatibilità durante la fase di transizione:

1. **Riconoscimento di entrambi i tipi di codici**:
   - L'interfaccia utente cerca il codice inserito in entrambe le tabelle (`quiz_templates` e `access_codes`)
   - Se trova un codice in `quiz_templates`, lo memorizza come `quizCode` e dà accesso al quiz specifico
   - Se trova un codice in `access_codes`, lo memorizza come `accessCode` e dà accesso a tutti i quiz pubblici

2. **Supporto per codici con e senza prefisso**:
   - L'applicazione gestisce sia i codici nel formato "QUIZ-XXXXXX" che "XXXXXX"
   - Questa compatibilità è mantenuta durante la fase di transizione al nuovo formato

3. **Query SQL per aggiornare il sistema**:
   - Sono state implementate funzioni sul database per generare automaticamente codici con il prefisso "QUIZ-"
   - Le funzioni di rigenerazione dei codici sono state aggiornate per mantenere la coerenza

#### Verifica della validità dei codici
Per verificare lo stato dei codici nel database, è possibile eseguire:
```sql
-- Verifica codice quiz
SELECT * FROM quiz_templates WHERE quiz_code = 'CODICE';

-- Verifica codice di accesso
SELECT * FROM access_codes WHERE code = 'CODICE';
```

### Utilizzo dei Codici di Accesso
1. **Per Attivare un Account Istruttore**:
   - L'utente accede alla pagina del profilo istruttore
   - Inserisce un codice istruttore valido (senza prefisso "QUIZ-")
   - Il sistema verifica la validità del codice
   - Se valido, l'account viene attivato come istruttore

2. **Per Accedere ai Quiz (Studenti)**:
   - Lo studente accede alla pagina dei quiz
   - Inserisce un codice quiz valido (con prefisso "QUIZ-")
   - Il sistema verifica la validità del codice in entrambe le tabelle:
     a. Cerca prima nella tabella `quiz_templates` per codici quiz specifici
     b. Se non trova corrispondenze, cerca nella tabella `access_codes` per codici di accesso generali
   - Se trova un codice quiz, lo studente ottiene accesso al quiz specifico
   - Se trova un codice di accesso:
     a. Lo studente ottiene accesso a tutti i quiz pubblici
     b. Il sistema registra l'utilizzo del codice nella tabella `access_code_usage`
     c. Viene creata un'associazione studente-istruttore nella tabella `student_instructor`
     d. Lo studente appare nella sezione "Gestione Studenti" dell'istruttore che ha creato il codice
   - Il sistema gestisce automaticamente entrambi i formati (con e senza prefisso "QUIZ-")

3. **Flusso di Verifica dei Codici**:
   - Quando uno studente inserisce un codice, il sistema esegue i seguenti controlli:
     1. Verifica che il codice inizi con "QUIZ-" (formato richiesto)
     2. Cerca il codice esatto nella tabella `quiz_templates`
     3. Se non lo trova, cerca il codice senza prefisso nella tabella `quiz_templates`
     4. Se ancora non lo trova, cerca il codice nella tabella `access_codes`
     5. Se lo trova in qualsiasi passaggio, concede l'accesso appropriato
     6. Se non lo trova in nessuna tabella, mostra un messaggio di errore

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
1. L'istruttore o l'admin seleziona il tipo di quiz da creare
2. Compila le informazioni di base (titolo, descrizione, categoria)
3. Aggiunge domande, opzioni e risposte corrette
4. Può caricare immagini per illustrare le domande
5. Imposta la visibilità del quiz (pubblica o privata)
6. Salva il quiz

### Sessione Quiz Interattivo
1. L'istruttore crea un quiz interattivo
2. Clicca sul pulsante "Avvia" per creare una sessione
3. Il sistema genera automaticamente un codice PIN univoco e lo mostra all'istruttore
4. L'istruttore condivide il codice PIN con gli studenti (può copiarlo facilmente con un clic)
5. Gli studenti accedono utilizzando il codice PIN
6. L'istruttore monitora la partecipazione in tempo reale
7. Gli studenti rispondono alle domande in tempo reale
8. La leaderboard mostra i risultati in diretta
9. L'istruttore può terminare la sessione in qualsiasi momento

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

## Interfaccia Utente

### Sidebar e Navigazione

#### Sidebar Amministratore
- Dashboard
- Tutti i Quiz
- Gestione Quiz
- Quiz Interattivi
- Gestione Utenti
- Statistiche Globali
- Impostazioni

#### Sidebar Istruttore
- Dashboard
- Tutti i Quiz (visualizzazione di tutti i quiz disponibili nel sistema, con possibilità di testarli)
- Gestione Quiz (creazione e gestione dei propri quiz personali)
- Quiz Interattivi
- Gestione Alunni (monitoraggio degli studenti che hanno attivato i codici)
- Statistiche dei propri quiz
- Profilo

#### Sidebar Studente
- Dashboard
- Quiz Disponibili
- Cronologia Quiz
- I Miei Risultati
- Quiz Interattivi
- Profilo

### Funzionalità Specifiche per Ruolo

#### Amministratore
- Può creare, modificare ed eliminare qualsiasi quiz
- Può rendere pubblici o privati i quiz
- Ha accesso completo a tutte le statistiche e ai dati degli utenti

#### Istruttore
- Ha due sezioni distinte per i quiz:
  - **Tutti i Quiz**: Permette di visualizzare e testare tutti i quiz disponibili nel sistema senza influire sulle statistiche
  - **Gestione Quiz**: Permette di creare, modificare ed eliminare solo i propri quiz personali
- Può testare qualsiasi quiz tramite la modalità di test, che apre il quiz in una nuova scheda senza registrare risultati nelle statistiche
- Può creare e gestire sessioni di quiz interattivi con codici PIN
- Può rendere pubblici o privati i propri quiz
- Può monitorare gli studenti che hanno attivato i codici attraverso la sezione "Gestione Alunni"
- Può visualizzare statistiche relative solo ai propri quiz

#### Studente
- Può accedere ai quiz tramite codici forniti dagli istruttori
- Può visualizzare solo i propri risultati e progressi
- Può partecipare a sessioni interattive tramite codice PIN
- Può accedere alla sezione "Cronologia Quiz" per visualizzare e filtrare i risultati dei quiz completati:
  - Filtro per categoria di quiz
  - Filtro per tipo di quiz (esame, apprendimento, interattivo)
  - Filtro per data (mese/anno)
  - Visualizzazione di statistiche e grafici aggiornati in base ai filtri selezionati

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

## Nuove Funzionalità

### Gestione Migliorata dei Quiz Interattivi

#### Descrizione
È stata migliorata la gestione dei quiz interattivi con un sistema di codici PIN più robusto e un'interfaccia utente più intuitiva.

#### Implementazione
1. **Generazione Automatica di PIN**: Ogni sessione di quiz interattivo riceve automaticamente un codice PIN a 6 cifre
2. **Visualizzazione Chiara del PIN**: Il PIN viene mostrato in modo evidente nell'interfaccia con possibilità di copia rapida
3. **Notifica all'Avvio**: Quando un quiz viene avviato, viene mostrato un messaggio con il PIN da condividere con gli studenti
4. **Gestione Robusta delle Sessioni**: Migliorata la gestione delle sessioni attive e in attesa

#### Vantaggi
- **Esperienza Utente Migliorata**: Processo più fluido per istruttori e studenti
- **Condivisione Facilitata**: Copia rapida del PIN per condividerlo con gli studenti
- **Feedback Immediato**: Notifiche chiare durante l'avvio e la gestione delle sessioni
- **Robustezza**: Gestione migliorata degli errori e delle eccezioni

#### File Modificati
- `src/components/interactive/QuizLiveManager.tsx`: Migliorata la gestione delle sessioni e dei PIN
- `src/components/instructor/QuizCreator.tsx`: Aggiunta la generazione di PIN per i quiz interattivi

#### Utilizzo
1. Creare un nuovo quiz interattivo o selezionarne uno esistente
2. Cliccare sul pulsante "Avvia" per creare una sessione
3. Il sistema genera automaticamente un codice PIN e lo mostra all'istruttore
4. Condividere il PIN con gli studenti (copiandolo con un clic)
5. Monitorare la partecipazione degli studenti in tempo reale
6. Avviare il quiz quando tutti gli studenti sono pronti

### Visibilità dei Quiz per Istruttori

#### Descrizione
È stata implementata la possibilità per gli istruttori di impostare la visibilità (pubblica o privata) dei propri quiz, funzionalità precedentemente riservata agli amministratori.

#### Implementazione
1. **Selettore di Visibilità**: Aggiunto un selettore di visibilità nel form di creazione/modifica quiz
2. **Gestione Permessi**: Modificate le politiche di sicurezza per consentire agli istruttori di modificare la visibilità
3. **Interfaccia Unificata**: La stessa interfaccia è utilizzata per tutti i tipi di quiz (esame, apprendimento, interattivo)

#### Vantaggi
- **Maggiore Autonomia**: Gli istruttori possono gestire autonomamente la visibilità dei propri quiz
- **Flessibilità**: Possibilità di creare quiz privati per specifici gruppi di studenti
- **Esperienza Coerente**: Interfaccia unificata per tutti i tipi di quiz

#### File Modificati
- `src/components/instructor/QuizCreator.tsx`: Aggiunto selettore di visibilità per tutti i tipi di quiz
- `src/components/instructor/QuizManager.tsx`: Modificata la funzione di gestione della visibilità
- `src/components/instructor/QuizList.tsx`: Aggiornata l'interfaccia per mostrare e modificare la visibilità

#### Utilizzo
1. Durante la creazione di un nuovo quiz, selezionare la visibilità desiderata (pubblica o privata)
2. Per i quiz esistenti, utilizzare il toggle di visibilità nella lista dei quiz
3. I quiz pubblici saranno visibili a tutti gli studenti
4. I quiz privati saranno visibili solo agli studenti con un codice di accesso specifico

### Miglioramento della gestione dei codici (Giugno 2024)

#### Descrizione
È stato implementato un sistema migliorato per la gestione dei codici quiz e dei codici di accesso, eliminando la confusione tra i due sistemi e garantendo una corretta verifica di entrambi i tipi di codici.

#### Problema risolto
- Gli studenti incontravano errori quando inserivano codici di accesso con il prefisso "QUIZ-"
- Il sistema cercava questi codici solo nella tabella `quiz_templates` e non nella tabella `access_codes`
- I codici di accesso validi non venivano riconosciuti correttamente
- Gli studenti non venivano associati all'istruttore nella sezione "Gestione Studenti"

#### Modifiche implementate
1. **Ricerca in entrambe le tabelle**:
   - `QuizSelector.tsx`: Modificato per cercare sequenzialmente in `quiz_templates` e `access_codes`
   - `QuizCategories.tsx`: Aggiornato per gestire sia `quizCode` che `accessCode` nel localStorage

2. **Gestione migliorata dei prefissi**:
   - Supporto completo per codici con e senza prefisso "QUIZ-"
   - Compatibilità con i codici esistenti durante la fase di transizione

3. **Differenziazione chiara**:
   - Distinzione netta tra codici quiz (per quiz specifici) e codici di accesso (per accesso generale)
   - Documentazione aggiornata per chiarire le differenze tra i due tipi di codici

4. **Registrazione dell'utilizzo dei codici**:
   - Quando uno studente usa un codice di accesso, l'utilizzo viene registrato in `access_code_usage`
   - Viene creata un'associazione studente-istruttore in `student_instructor`
   - Lo studente appare nella sezione "Gestione Studenti" dell'istruttore che ha creato il codice

#### Vantaggi
- **Esperienza utente migliorata**: Gli studenti possono utilizzare entrambi i tipi di codici senza errori
- **Compatibilità garantita**: Supporto per i formati vecchi e nuovi dei codici
- **Flessibilità**: Gli amministratori possono utilizzare entrambi i sistemi di codici in base alle esigenze
- **Tracciamento completo**: Gli istruttori possono vedere tutti gli studenti che hanno utilizzato i loro codici

#### Verifica delle modifiche
Per verificare il corretto funzionamento del sistema, è possibile:
- Inserire un codice quiz (formato: "QUIZ-XXXXXX" o "XXXXXX") per accedere a un quiz specifico
- Inserire un codice di accesso (formato: "QUIZ-XXXXXX") per ottenere accesso a tutti i quiz pubblici
- Verificare che lo studente appaia nella sezione "Gestione Studenti" dell'istruttore
- Controllare nei log di console il percorso di verifica seguito dal sistema

### Miglioramento della visualizzazione della Cronologia Codici di Accesso (Giugno 2024)

#### Descrizione
È stata migliorata la visualizzazione della cronologia dei codici di accesso per gli studenti, assicurando che il nome dell'istruttore che ha fornito il codice sia chiaramente visibile.

#### Problema risolto
- Gli studenti non potevano vedere chi aveva fornito loro i codici di accesso
- Il componente tentava di accedere a tabelle con problemi di autorizzazione
- La visualizzazione dell'interfaccia utente non era sufficientemente chiara

#### Modifiche implementate
1. **Miglioramento dell'accesso ai dati**:
   - Implementato un sistema robusto per recuperare i nomi degli istruttori
   - Aggiunto un meccanismo di fallback che genera nomi dagli indirizzi email quando i dati completi non sono disponibili
   - Migliorati i log di debug per facilitare la risoluzione dei problemi

2. **Ottimizzazione della visualizzazione**:
   - Aggiunta un'icona utente accanto al nome dell'istruttore
   - Implementato uno stile distintivo per rendere l'informazione più evidente
   - Aggiunta l'etichetta "Fornito da:" prima del nome dell'istruttore
   - Migliorato il layout generale delle card della cronologia per una migliore leggibilità

3. **Gestione degli errori**:
   - Implementato un sistema di gestione degli errori più robusto
   - Aggiunta la visualizzazione di messaggi di errore più chiari
   - Fornito un fallback visivo appropriato quando i dati non sono disponibili

#### Vantaggi
- **Maggiore trasparenza**: Gli studenti possono ora vedere chiaramente chi ha fornito loro i codici di accesso
- **Migliore esperienza utente**: L'interfaccia è più intuitiva e fornisce informazioni più complete
- **Robustezza**: Il sistema gestisce correttamente anche quando l'accesso a determinate tabelle del database è limitato

#### File modificati
- `src/components/student/AccessCodeHistory.tsx`: Aggiornata la logica di recupero dei dati e la visualizzazione
  - Migliorata la funzione `getInstructorNames` per gestire diverse fonti di dati
  - Aggiunta la funzione `generateNamesFromEmails` per creare nomi leggibili dalle email
  - Aggiornato il layout delle card per mostrare più chiaramente l'istruttore

#### Utilizzo
Gli studenti possono accedere alla "Cronologia Codici di Accesso" dalla sidebar e vedere:
1. I codici che hanno utilizzato
2. Lo stato attuale di ciascun codice (attivo o scaduto)
3. La data di utilizzo e di scadenza
4. Il nome dell'istruttore che ha fornito ciascun codice

### Sistema di Codici PRO per Attivazione Istruttori (Luglio 2024)

#### Descrizione
È stato implementato un sistema avanzato di gestione dei codici PRO per l'attivazione degli account istruttore. Questo sistema è separato dal sistema di codici QUIZ e fornisce un metodo sicuro e tracciabile per attivare gli account degli istruttori.

#### Problema risolto
- Eliminata la confusione tra codici per studenti (QUIZ-) e codici per istruttori (PRO-)
- Migliorata la sicurezza dell'attivazione degli account istruttore
- Aggiunta la possibilità di assegnare specifici codici a specifici indirizzi email
- Implementato un sistema di tracciamento completo dell'attivazione dei codici

#### Architettura del sistema
1. **Struttura del database**:
   - **Tabella `instructor_activation_codes`**: Memorizza i codici PRO per l'attivazione degli istruttori
     - `id`: UUID univoco per ogni codice
     - `code`: Stringa nel formato "PRO-XXXXXX" (es. "PRO-123456")
     - `created_by`: UUID dell'amministratore che ha creato il codice (può essere NULL)
     - `assigned_to_email`: Email dell'istruttore a cui è assegnato il codice
     - `is_active`: Booleano che indica se il codice è attivo
     - `created_at`: Timestamp di creazione del codice
     - `expiration_date`: Timestamp di scadenza del codice
     - `used_at`: Timestamp che indica quando il codice è stato utilizzato (NULL se non utilizzato)
     - `used_by`: ID o email dell'utente che ha utilizzato il codice

   - **Tabella `auth_users`**: Contiene gli utenti del sistema
     - Relazione con `instructor_activation_codes` tramite l'email

2. **Differenziazione dei codici**:
   - **Codici PRO (PRO-XXXXXX)**: Utilizzati esclusivamente per l'attivazione degli account istruttore
   - **Codici QUIZ (QUIZ-XXXXXX)**: Utilizzati esclusivamente dagli studenti per accedere ai quiz

#### Flusso completo di creazione e utilizzo dei codici PRO

##### 1. Creazione dei codici PRO (Amministratore)
1. L'amministratore accede alla sezione "Codici PRO" nella dashboard
2. Inserisce l'email dell'istruttore a cui assegnare il codice
3. Imposta la validità del codice in giorni (default: 30 giorni)
4. Clicca su "Genera Codice PRO"
5. Il sistema genera automaticamente un codice nel formato "PRO-XXXXXX"
6. Il codice viene salvato nel database con:
   - `assigned_to_email`: Email dell'istruttore specificata
   - `is_active`: true
   - `created_at`: Data e ora correnti
   - `expiration_date`: Data corrente + giorni di validità specificati
   - `used_at` e `used_by`: NULL (non ancora utilizzato)
7. Il codice generato viene mostrato all'amministratore, che può copiarlo negli appunti

##### 2. Amministrazione dei codici PRO (Amministratore)
1. L'amministratore può visualizzare tutti i codici PRO generati
2. Per ogni codice, può vedere:
   - Il codice completo (es. "PRO-123456")
   - L'email dell'istruttore a cui è assegnato
   - Lo stato del codice (Attivo, Attivato, Disattivato)
   - La data di creazione
   - La data di scadenza
   - Se è stato utilizzato, la data di attivazione e l'ID utente
3. Può disattivare un codice in qualsiasi momento
4. Può verificare lo stato di attivazione di un codice tramite il pulsante di verifica
5. Può sincronizzare manualmente i dati di attivazione per un codice che mostra "In attesa di attivazione" ma che è stato effettivamente utilizzato

##### 3. Attivazione del codice PRO (Istruttore)
1. L'istruttore accede alla pagina del profilo
2. Visualizza la sezione "Attivazione Profilo Istruttore"
3. Inserisce il codice PRO ricevuto dall'amministratore
4. Il sistema verifica che:
   - Il codice esista nella tabella `instructor_activation_codes`
   - Il codice sia attivo (`is_active = true`)
   - Il codice non sia scaduto (`expiration_date > NOW()`)
   - Il codice sia assegnato all'email dell'istruttore corrente
5. Se tutte le verifiche hanno successo:
   - Il campo `used_at` viene aggiornato con la data e ora correnti
   - Il campo `used_by` viene aggiornato con l'ID utente o l'email dell'istruttore
   - Lo stato dell'account dell'istruttore viene aggiornato a `active`
   - I flag `hasInstructorAccess` e `hasActiveAccess` vengono impostati a `true` nel localStorage
   - L'istruttore riceve accesso completo alle funzionalità di istruttore
6. Se la verifica fallisce:
   - Viene mostrato un messaggio di errore specifico (es. "Codice non valido", "Codice assegnato a un'altra email")
   - L'accesso alle funzionalità di istruttore rimane bloccato

##### 4. Visualizzazione dei codici utilizzati (Istruttore)
1. L'istruttore può visualizzare la cronologia dei codici utilizzati nella sezione "Profilo"
2. Per ogni codice, può vedere:
   - Il codice completo (es. "PRO-123456")
   - Il tipo di codice (Master, Istruttore)
   - La data di utilizzo
   - La data di creazione
   - La data di scadenza
   - Lo stato del codice (Attivo, Disattivato)

#### Sincronizzazione e risoluzione dei problemi

##### 1. Sincronizzazione automatica
- All'accesso, il sistema verifica automaticamente lo stato di attivazione dell'istruttore
- Se l'istruttore ha un codice attivato, i flag `hasInstructorAccess` e `hasActiveAccess` vengono sincronizzati
- Il sistema verifica che il codice non sia stato disattivato o non sia scaduto

##### 2. Sincronizzazione manuale (Amministratore)
1. Se un codice PRO è stato utilizzato ma nel pannello amministrativo appare ancora come "In attesa di attivazione":
   - L'amministratore può cliccare sul pulsante "Sincronizza" accanto al codice
   - Il sistema cercherà prima l'ID utente nel database tramite l'email associata
   - Se trova l'ID, aggiorna il record con l'ID utente e la data corrente
   - Se non trova l'ID, utilizza l'email come fallback
   - Aggiorna anche lo stato dell'account utente a `active`
   - Il codice apparirà ora come "Attivato" con la data di attivazione

##### 3. Verifica dello stato (Amministratore)
1. L'amministratore può verificare lo stato di un codice specifico tramite il pulsante di verifica (icona refresh) 
2. Il sistema esegue una query diretta per verificare se il codice è stato attivato
3. Mostra un messaggio dettagliato con lo stato corrente del codice:
   - Se attivato: "Il codice PRO-XXXXXX è stato attivato il [data] da [email]"
   - Se non attivato: "Il codice PRO-XXXXXX non è ancora stato attivato"

#### Query SQL di supporto per la gestione dei codici PRO

1. **Aggiornamento manuale di un codice PRO**:
```sql
-- Aggiorna il codice PRO con l'ID utente corretto
UPDATE instructor_activation_codes
SET 
  used_at = CURRENT_TIMESTAMP,
  used_by = '[ID_UTENTE]'
WHERE 
  code = 'PRO-XXXXXX' 
  AND assigned_to_email = '[EMAIL]';

-- Aggiorna anche lo stato dell'account dell'utente
UPDATE auth_users
SET 
  account_status = 'active'
WHERE 
  id = '[ID_UTENTE]';
```

2. **Verifica dello stato di un codice PRO**:
```sql
-- Verifica lo stato di attivazione di un codice PRO
SELECT 
  code,
  assigned_to_email,
  is_active,
  created_at,
  expiration_date,
  used_at,
  used_by
FROM instructor_activation_codes
WHERE code = 'PRO-XXXXXX';
```

3. **Ricerca dei codici PRO assegnati a un'email specifica**:
```sql
-- Cerca tutti i codici assegnati a un'email specifica
SELECT * FROM instructor_activation_codes
WHERE assigned_to_email = '[EMAIL]'
ORDER BY created_at DESC;
```

#### File modificati e implementazioni principali

1. **Componente AdminInstructorCodesManager**:
   - Aggiunta funzione `handleGenerateProCode` per generare nuovi codici PRO
   - Aggiunta funzione `fetchActivationCodes` per recuperare l'elenco dei codici
   - Aggiunta funzione `handleDeactivateCode` per disattivare i codici
   - Aggiunta funzione `handleCheckActivationStatus` per verificare lo stato dei codici
   - Aggiunta funzione `handleSyncActivationData` per sincronizzare manualmente i dati di attivazione

2. **Componente InstructorProfile**:
   - Modificata funzione `checkActiveCode` per verificare i codici PRO
   - Aggiunta gestione specifica per i codici che iniziano con "PRO-"
   - Implementata logica per verificare che il codice sia assegnato all'email corretta
   - Aggiunta logica per aggiornare i campi `used_at` e `used_by` nel database

3. **Struttura del database**:
   - Aggiunta tabella `instructor_activation_codes` per memorizzare i codici PRO
   - Implementate politiche di sicurezza RLS appropriate per proteggere i dati

#### Vantaggi del nuovo sistema

1. **Sicurezza migliorata**:
   - I codici PRO sono assegnati a email specifiche
   - Solo l'utente con l'email corretta può attivare un codice
   - Gli amministratori possono disattivare codici in qualsiasi momento

2. **Tracciabilità completa**:
   - Ogni codice PRO è tracciabile dall'inizio alla fine
   - Timestamp precisi di creazione, attivazione e scadenza
   - Gli amministratori possono vedere chi ha attivato ogni codice

3. **User experience migliorata**:
   - Messaggi di errore specifici per guidare l'utente
   - Interfaccia intuitiva per amministratori e istruttori
   - Visualizzazione chiara dello stato dei codici

4. **Gestione semplificata**:
   - Generazione automatica di codici nel formato corretto
   - Interfaccia user-friendly per gli amministratori
   - Funzioni di sincronizzazione e verifica per risolvere problemi

5. **Separazione chiara dai codici QUIZ**:
   - I codici PRO (PRO-XXXXXX) sono esclusivamente per l'attivazione degli istruttori
   - I codici QUIZ (QUIZ-XXXXXX) sono esclusivamente per l'accesso ai quiz da parte degli studenti
   - Nessuna confusione possibile tra i due sistemi

---

Ultimo aggiornamento: 8 luglio 2024