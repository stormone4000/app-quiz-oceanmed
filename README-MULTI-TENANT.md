# Sistema Multi-Tenant con Visibilità Selettiva

Questo documento descrive come utilizzare il sistema multi-tenant implementato nell'applicazione, che permette a ogni istruttore di avere il proprio spazio isolato con i propri contenuti, mentre gli studenti possono accedere ai contenuti di diversi istruttori tramite un sistema di attivazione.

## Panoramica del Sistema

Il sistema implementa un'architettura multi-tenant con visibilità selettiva, che offre i seguenti vantaggi:

- **Spazi Isolati per Istruttori**: Ogni istruttore ha il proprio spazio con contenuti separati
- **Visibilità Selettiva per Studenti**: Gli studenti possono accedere ai contenuti di diversi istruttori
- **Sistema di Attivazione**: Gli studenti attivano i contenuti degli istruttori tramite codici di attivazione
- **Monitoraggio delle Attivazioni**: Gli istruttori possono vedere quali studenti hanno attivato i loro contenuti

## Configurazione del Database

Per utilizzare il sistema multi-tenant, è necessario eseguire i seguenti script SQL:

1. `db-migrations/add-activation-code.sql`: Aggiunge un campo per il codice di attivazione nella tabella degli istruttori
2. `db-migrations/create-activation-tables.sql`: Crea le tabelle necessarie per le attivazioni degli studenti

## Guida per gli Istruttori

### Gestione dei Contenuti

Come istruttore, puoi:

1. Creare categorie e video che saranno automaticamente associati al tuo profilo tramite il campo `creator_id`
2. Visualizzare e gestire solo i contenuti che hai creato
3. Monitorare quali studenti hanno attivato i tuoi contenuti

### Codice di Attivazione

Ogni istruttore ha un codice di attivazione unico che può condividere con i propri studenti:

1. Accedi alla sezione "Codice di Attivazione" nel tuo profilo
2. Copia il codice e condividilo con i tuoi studenti
3. Se necessario, puoi generare un nuovo codice (gli studenti che hanno già attivato i tuoi contenuti non saranno influenzati)

### Monitoraggio degli Studenti

Puoi monitorare quali studenti hanno attivato i tuoi contenuti:

1. Accedi alla sezione "Attivazioni Studenti" nel tuo profilo
2. Visualizza l'elenco degli studenti che hanno attivato i tuoi contenuti, con dettagli su quali contenuti sono stati attivati e quando

## Guida per gli Studenti

### Visualizzazione dei Contenuti

Come studente, puoi:

1. Accedere alla pagina "Video Didattici" per visualizzare tutti i contenuti disponibili
2. Utilizzare il filtro per istruttore per visualizzare solo i contenuti di un determinato istruttore
3. Esplorare le categorie e i video disponibili

### Attivazione dei Contenuti

Per accedere ai contenuti di un istruttore:

1. Accedi alla sezione "Attiva Contenuti"
2. Inserisci il codice di attivazione fornito dall'istruttore
3. Una volta attivati, i contenuti dell'istruttore saranno disponibili nella pagina "Video Didattici"

## Implementazione Tecnica

Il sistema utilizza i seguenti componenti:

- **VideoManager.tsx**: Componente per gli istruttori per gestire i propri contenuti
- **VideoList.tsx**: Componente per gli studenti per visualizzare i contenuti disponibili
- **InstructorFilter.tsx**: Componente per filtrare i contenuti per istruttore
- **ContentActivation.tsx**: Componente per gli studenti per attivare i contenuti di un istruttore
- **StudentActivations.tsx**: Componente per gli istruttori per monitorare le attivazioni
- **ActivationCodeManager.tsx**: Componente per gli istruttori per gestire il proprio codice di attivazione

## Tabelle del Database

Il sistema utilizza le seguenti tabelle:

- **instructor_profiles**: Contiene i profili degli istruttori, incluso il codice di attivazione
- **video_categories**: Contiene le categorie di video, associate agli istruttori tramite `creator_id`
- **videos**: Contiene i video, associati agli istruttori tramite `creator_id`
- **student_video_activations**: Registra quali video sono stati attivati da quali studenti
- **student_category_activations**: Registra quali categorie sono state attivate da quali studenti

## Sicurezza

Il sistema implementa politiche di sicurezza a livello di database (Row Level Security) per garantire che:

1. Gli istruttori possano vedere e gestire solo i propri contenuti
2. Gli studenti possano vedere solo i contenuti che hanno attivato
3. Le attivazioni siano protette e non possano essere manipolate

## Conclusione

Questo sistema offre il meglio di entrambi i mondi: la separazione e il controllo di un sistema multi-tenant, con la flessibilità e la condivisione di un sistema centralizzato. Gli istruttori mantengono la proprietà dei loro contenuti, mentre gli studenti beneficiano di un'esperienza di apprendimento ricca e personalizzabile. 