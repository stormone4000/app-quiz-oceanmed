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
- Non può rendere pubblici o privati i quiz (a differenza dell'admin)

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
1. L'istruttore o l'admin seleziona il tipo di quiz da creare
2. Compila le informazioni di base (titolo, descrizione, categoria)
3. Aggiunge domande, opzioni e risposte corrette
4. Può caricare immagini per illustrare le domande
5. Salva il quiz
6. Se è un admin, può scegliere se rendere il quiz pubblico o privato
7. Se è un istruttore, ottiene un codice quiz da distribuire agli studenti

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
- Ottiene codici quiz da distribuire agli studenti
- Non può rendere pubblici o privati i quiz (a differenza dell'admin)
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

### Cronologia Quiz con Filtri Avanzati

#### Descrizione
È stata aggiunta una nuova sezione "Cronologia Quiz" nella sidebar dello studente che permette di visualizzare e filtrare i risultati dei quiz completati.

#### Implementazione
1. **Nuova Voce di Menu**: Aggiunta la voce "Cronologia Quiz" nella sidebar, visibile solo per gli studenti
2. **Componente Dedicato**: Utilizzo del componente `StudentStats` con l'opzione `showFilters` abilitata
3. **Filtri Implementati**:
   - **Filtro per Categoria**: Permette di filtrare i quiz per categoria (es. Navigazione, Meteorologia, ecc.)
   - **Filtro per Tipo di Quiz**: Permette di filtrare per tipo (Esame, Apprendimento, Interattivo)
   - **Filtro per Data**: Permette di filtrare per mese/anno di completamento

#### Vantaggi
- **Migliore Organizzazione**: Accesso diretto alla cronologia dei quiz dalla sidebar
- **Analisi Dettagliata**: Possibilità di analizzare i risultati per categoria o tipo di quiz
- **Monitoraggio Temporale**: Visualizzazione dei progressi nel tempo
- **Statistiche Dinamiche**: Aggiornamento automatico di statistiche e grafici in base ai filtri selezionati

#### File Modificati
- `src/components/layout/Sidebar.tsx`: Aggiunta voce di menu
- `src/components/layout/DashboardLayout.tsx`: Aggiornamento tipi
- `src/components/StudentDashboard.tsx`: Implementazione della nuova tab
- `src/components/student/StudentStats.tsx`: Aggiunta funzionalità di filtro

#### Utilizzo
1. Accedere alla dashboard dello studente
2. Cliccare su "Cronologia Quiz" nella sidebar
3. Utilizzare i filtri nella parte superiore per raffinare i risultati
4. Visualizzare statistiche e grafici aggiornati in base ai filtri selezionati
5. Cliccare su un quiz specifico per visualizzarne i dettagli

## Risoluzione Problemi di Salvataggio Quiz

### Problemi Risolti

#### 1. Errore 404 per RPC `get_quiz_questions`
- **Problema**: L'applicazione generava un errore 404 quando tentava di chiamare una funzione RPC inesistente.
- **Soluzione**: Ristrutturazione della funzione `loadQuizData` per rimuovere la chiamata RPC problematica e implementare query dirette alle tabelle `quiz_templates` e `quiz_questions`.
- **Miglioramenti**: Implementazione di tentativi di caricamento multipli e isolati con gestione degli errori migliorata.

#### 2. Errore di rendering in `QuizDetailReport`
- **Problema**: Errore "Objects are not valid as a React child" quando si tentava di renderizzare direttamente un oggetto.
- **Soluzione**: Modifica del componente per formattare correttamente l'oggetto `debugInfo` prima del rendering.

#### 3. Errore "Could not find the 'category' column of 'quizzes'"
- **Problema**: La colonna 'category' non esisteva nella tabella 'quizzes'.
- **Soluzione**: Modifica del codice in `Quiz.tsx` per rimuovere il campo 'category' non esistente o aggiunta della colonna al database.

#### 4. Errore "Could not find the 'questions' column of 'quizzes'"
- **Problema**: La colonna 'questions' non esisteva nella tabella 'quizzes'.
- **Soluzione**: Modifica del codice in `Quiz.tsx` per rimuovere il campo 'questions' non esistente o aggiunta della colonna al database.

#### 5. Errore "invalid input syntax for type uuid: 'exam'"
- **Problema**: Il campo 'type_id' nella tabella 'quizzes' è di tipo UUID, ma veniva inserita la stringa 'exam'.
- **Soluzione**: 
  - Implementazione di una ricerca di un type_id valido dalla tabella `quiz_types` invece di usare una stringa fissa.
  - Mappatura corretta dei tipi di quiz interni ('exam', 'learning', 'interactive') ai nomi dei tipi nel database ('Esame Standardizzato', 'Modulo di Apprendimento', 'Quiz Interattivo').
  - Aggiunta della proprietà `quiz_type` all'interfaccia `QuizResult` in `types.ts`.

### Implementazione della Soluzione

#### In `Quiz.tsx`:
```typescript
// Mappiamo il tipo di quiz interno ai nomi dei tipi nel database
let quizTypeName = 'Esame Standardizzato'; // Default per 'exam'
if (quiz.quiz_type === 'learning') {
  quizTypeName = 'Modulo di Apprendimento';
} else if (quiz.quiz_type === 'interactive') {
  quizTypeName = 'Quiz Interattivo';
}

// Cerchiamo un type_id che corrisponda al tipo del quiz corrente
const { data: quizTypes, error: typesError } = await supabase
  .from('quiz_types')
  .select('id, name')
  .eq('name', quizTypeName);
  
let validTypeId;

if (typesError || !quizTypes || quizTypes.length === 0) {
  // Fallback: prendiamo il primo tipo disponibile
  const { data: anyTypes } = await supabase
    .from('quiz_types')
    .select('id')
    .limit(1);
    
  validTypeId = anyTypes[0].id;
} else {
  validTypeId = quizTypes[0].id;
}

// Usiamo il type_id valido nel quiz
const { data: newQuiz, error: quizError } = await supabase
  .from('quizzes')
  .insert([{
    // ...altri campi
    type_id: validTypeId,
    // ...altri campi
  }])
```

#### In `api.ts`:
Implementazione simile per la funzione `saveQuizResult` che ora cerca un type_id valido dalla tabella `quiz_types` invece di usare la stringa 'exam'.

#### In `types.ts`:
```typescript
export interface QuizResult {
  // ...altri campi
  quiz_type?: QuizType;
}

export type QuizType = 'exam' | 'learning' | 'interactive';
```

### Vantaggi della Soluzione
1. **Robustezza**: L'applicazione ora gestisce correttamente i tipi di quiz e i vincoli di chiave esterna.
2. **Coerenza dei dati**: I risultati dei quiz sono associati al tipo di quiz corretto.
3. **Flessibilità**: Supporta diversi tipi di quiz (exam, learning, interactive).
4. **Diagnostica migliorata**: Logging dettagliato per facilitare il debug.

### Struttura della Tabella `quiz_types`
La tabella contiene tre tipi di quiz:
1. **Esame Standardizzato** (ID: f7d87e26-0163-46ae-b235-5f635f4c1a8d)
   - Descrizione: Quiz di simulazione esame patente nautica con 20 domande e tempo limite di 30 minuti
2. **Modulo di Apprendimento** (ID: ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7)
   - Descrizione: Quiz formativi su argomenti specifici con durata flessibile
3. **Quiz Interattivo** (ID: d39237a7-7fda-435f-8b57-26cfbae805f5)
   - Descrizione: Quiz interattivi creati dagli insegnanti per gli studenti

---

Questo documento verrà aggiornato regolarmente per riflettere le modifiche e le nuove funzionalità dell'applicazione.

Ultimo aggiornamento: 31 maggio 2024 

## Gestione dello Stato con Redux

### Panoramica dell'Implementazione Redux

L'applicazione utilizza Redux come soluzione centralizzata per la gestione dello stato, in particolare per i dati di autenticazione e autorizzazione. Questo approccio risolve diversi problemi critici, tra cui la sincronizzazione del flag `hasInstructorAccess` in tutta l'applicazione.

### Struttura Redux

La configurazione Redux include:

- **Store**: Il punto centrale che contiene tutto lo stato dell'applicazione
- **Slices**: Porzioni specializzate dello stato globale (es. authSlice per l'autenticazione)
- **Reducers**: Funzioni che definiscono come lo stato cambia in risposta alle azioni
- **Actions**: Eventi che innescano le modifiche allo stato
- **Selectors**: Funzioni per estrarre dati specifici dallo stato

### Directory e File Principali

```
src/
└── redux/
    ├── store.ts             # Configurazione dello store Redux
    ├── hooks.ts             # Custom hooks tipizzati (useAppDispatch, useAppSelector)
    └── slices/
        └── authSlice.ts     # Gestione dello stato di autenticazione
```

### Lo Slice di Autenticazione

Il `authSlice.ts` implementa uno "slice" specifico per la gestione dell'autenticazione con le seguenti funzionalità:

- **Stato**: Informazioni sull'utente autenticato, inclusi:
  - `isAuthenticated`: Flag principale di autenticazione
  - `isStudent` / `isProfessor`: Tipo di utente
  - `hasInstructorAccess`: Permesso di accesso come istruttore
  - `isMasterAdmin`: Permessi amministrativi
  - `hasActiveAccess`: Accesso attivo alla piattaforma
  - `needsSubscription`: Necessità di sottoscrizione

- **Azioni**:
  - `login`: Autentica l'utente e imposta tutti i flag relativi
  - `logout`: Rimuove tutti i dati di autenticazione
  - `updateInstructorAccess`: Aggiorna specificamente i permessi dell'istruttore
  - `syncFromStorage`: Sincronizza lo stato Redux con localStorage

- **Selettori**:
  - Funzioni per accedere facilmente a porzioni specifiche dello stato di autenticazione

### Integrazione con l'Applicazione Esistente

Redux è integrato nell'applicazione mantenendo la compatibilità con il localStorage per garantire una transizione senza interruzioni:

1. **Inizializzazione dello Stato**: Lo stato iniziale viene caricato dal localStorage per mantenere la persistenza
2. **Sincronizzazione Bidirezionale**: Gli aggiornamenti a Redux vengono propagati al localStorage e viceversa
3. **Eventi di Storage**: Gli eventi nativi `storage` e personalizzati `localStorageUpdated` vengono intercettati per mantenere sincronizzato lo stato

### Componenti Aggiornati

I seguenti componenti sono stati aggiornati per utilizzare Redux:

- **UnifiedLoginCard**: Ora utilizza il dispatch di Redux per gestire l'autenticazione
- **LandingPage**: Implementa il logout centralizzato tramite Redux
- **App**: Aggiornato per utilizzare lo stato Redux invece del localStorage diretto

### Vantaggi dell'Implementazione Redux

1. **Stato Centralizzato**: Risolve il problema di coerenza dello stato tra componenti
2. **Flusso Dati Prevedibile**: Rende le modifiche allo stato tracciabili e prevedibili
3. **Debugging Migliorato**: Facilita l'identificazione e la risoluzione dei problemi
4. **Tipizzazione Completa**: Integrazione con TypeScript per una migliore sicurezza del tipo
5. **Gestione degli Eventi Migliorata**: Centralizza la risposta agli eventi di storage
6. **Scalabilità**: Fornisce una base robusta per future estensioni dell'applicazione

### Utilizzo nei Componenti

Per utilizzare Redux nei componenti:

```typescript
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { selectIsAuthenticated, login, logout } from '../redux/slices/authSlice';

function MyComponent() {
  // Accedi ai dati dello stato
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  // Ottieni il dispatcher per inviare azioni
  const dispatch = useAppDispatch();
  
  // Esempio di login
  const handleLogin = (userData) => {
    dispatch(login(userData));
  };
  
  // Esempio di logout
  const handleLogout = () => {
    dispatch(logout());
  };
  
  // Resto del componente...
}
```

### Risoluzione del Problema di Sincronizzazione dell'Accesso Istruttore

L'implementazione di Redux risolve specificamente il problema con il flag `hasInstructorAccess`:

1. Lo stato di accesso è ora gestito centralmente in un unico punto
2. Le modifiche all'accesso vengono propagate immediatamente a tutti i componenti
3. Il sincronismo con localStorage è gestito in modo coerente
4. Gli eventi di aggiornamento sono centralizzati

Questo garantisce che, quando un istruttore attiva il proprio accesso, lo stato venga aggiornato correttamente in tutta l'applicazione senza necessità di ricaricare la pagina.

### Manutenzione e Best Practices

1. **Preferire i Selettori**: Utilizza i selettori esportati invece di accedere direttamente allo stato
2. **Azioni Specifiche**: Crea azioni specifiche per modifiche semantiche dello stato
3. **Evitare Mutazioni**: Non modificare direttamente lo stato Redux (usare dispatch)
4. **Separazione delle Responsabilità**: Mantieni la logica di state management nei reducer, non nei componenti
5. **Utilizzare i Custom Hooks**: Usa `useAppDispatch` e `useAppSelector` per mantenere la tipizzazione

--- 