// Script per aggiornare la configurazione di Supabase nell'applicazione
const fs = require('fs');
const path = require('path');

// Configurazione nuovo database
const newSupabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const newSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

/**
 * Funzione per aggiornare il file .env
 */
function updateEnvFile() {
  console.log('\n--- AGGIORNAMENTO FILE .env ---');
  
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('⚠️ File .env non trovato, verrà creato un nuovo file');
      
      const envContent = `VITE_SUPABASE_URL=${newSupabaseUrl}
VITE_SUPABASE_ANON_KEY=${newSupabaseKey}
`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ File .env creato con successo');
      return true;
    }
    
    // Leggi il file .env esistente
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Aggiorna o aggiungi le variabili Supabase
    const supabaseUrlRegex = /VITE_SUPABASE_URL=.*/;
    const supabaseKeyRegex = /VITE_SUPABASE_ANON_KEY=.*/;
    
    if (supabaseUrlRegex.test(envContent)) {
      envContent = envContent.replace(supabaseUrlRegex, `VITE_SUPABASE_URL=${newSupabaseUrl}`);
    } else {
      envContent += `\nVITE_SUPABASE_URL=${newSupabaseUrl}`;
    }
    
    if (supabaseKeyRegex.test(envContent)) {
      envContent = envContent.replace(supabaseKeyRegex, `VITE_SUPABASE_ANON_KEY=${newSupabaseKey}`);
    } else {
      envContent += `\nVITE_SUPABASE_ANON_KEY=${newSupabaseKey}`;
    }
    
    // Scrivi il file .env aggiornato
    fs.writeFileSync(envPath, envContent);
    console.log('✅ File .env aggiornato con successo');
    return true;
  } catch (error) {
    console.error('❌ Errore nell\'aggiornamento del file .env:', error);
    return false;
  }
}

/**
 * Funzione per aggiornare il file netlify.toml
 */
function updateNetlifyToml() {
  console.log('\n--- AGGIORNAMENTO FILE netlify.toml ---');
  
  try {
    const netlifyPath = path.resolve(process.cwd(), 'netlify.toml');
    
    if (!fs.existsSync(netlifyPath)) {
      console.log('⚠️ File netlify.toml non trovato, verrà creato un nuovo file');
      
      const netlifyContent = `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = true

[build.environment]
  VITE_SUPABASE_URL = "${newSupabaseUrl}"
  VITE_SUPABASE_ANON_KEY = "${newSupabaseKey}"
`;
      
      fs.writeFileSync(netlifyPath, netlifyContent);
      console.log('✅ File netlify.toml creato con successo');
      return true;
    }
    
    // Leggi il file netlify.toml esistente
    let netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
    
    // Aggiorna le variabili Supabase
    const supabaseUrlRegex = /VITE_SUPABASE_URL = ".*"/;
    const supabaseKeyRegex = /VITE_SUPABASE_ANON_KEY = ".*"/;
    
    if (supabaseUrlRegex.test(netlifyContent)) {
      netlifyContent = netlifyContent.replace(supabaseUrlRegex, `VITE_SUPABASE_URL = "${newSupabaseUrl}"`);
    } else {
      console.log('⚠️ Variabile VITE_SUPABASE_URL non trovata nel file netlify.toml');
    }
    
    if (supabaseKeyRegex.test(netlifyContent)) {
      netlifyContent = netlifyContent.replace(supabaseKeyRegex, `VITE_SUPABASE_ANON_KEY = "${newSupabaseKey}"`);
    } else {
      console.log('⚠️ Variabile VITE_SUPABASE_ANON_KEY non trovata nel file netlify.toml');
    }
    
    // Scrivi il file netlify.toml aggiornato
    fs.writeFileSync(netlifyPath, netlifyContent);
    console.log('✅ File netlify.toml aggiornato con successo');
    return true;
  } catch (error) {
    console.error('❌ Errore nell\'aggiornamento del file netlify.toml:', error);
    return false;
  }
}

/**
 * Funzione per aggiornare il file di configurazione Supabase
 */
function updateSupabaseConfig() {
  console.log('\n--- AGGIORNAMENTO FILE DI CONFIGURAZIONE SUPABASE ---');
  
  try {
    const configPath = path.resolve(process.cwd(), 'src', 'services', 'supabase.ts');
    
    if (!fs.existsSync(configPath)) {
      console.log('⚠️ File di configurazione Supabase non trovato');
      return false;
    }
    
    // Leggi il file di configurazione esistente
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Aggiorna le variabili Supabase
    const supabaseUrlRegex = /supabaseUrl = .*? \|\| '.*?'/;
    const supabaseKeyRegex = /supabaseAnonKey = .*? \|\| '.*?'/;
    
    if (supabaseUrlRegex.test(configContent)) {
      configContent = configContent.replace(supabaseUrlRegex, `supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '${newSupabaseUrl}'`);
    } else {
      console.log('⚠️ Variabile supabaseUrl non trovata nel file di configurazione');
    }
    
    if (supabaseKeyRegex.test(configContent)) {
      configContent = configContent.replace(supabaseKeyRegex, `supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '${newSupabaseKey}'`);
    } else {
      console.log('⚠️ Variabile supabaseAnonKey non trovata nel file di configurazione');
    }
    
    // Scrivi il file di configurazione aggiornato
    fs.writeFileSync(configPath, configContent);
    console.log('✅ File di configurazione Supabase aggiornato con successo');
    return true;
  } catch (error) {
    console.error('❌ Errore nell\'aggiornamento del file di configurazione Supabase:', error);
    return false;
  }
}

/**
 * Funzione principale per aggiornare la configurazione di Supabase
 */
function updateSupabaseConfiguration() {
  console.log('==========================================');
  console.log('Aggiornamento configurazione Supabase');
  console.log('==========================================');
  
  // Aggiorna il file .env
  const envSuccess = updateEnvFile();
  
  // Aggiorna il file netlify.toml
  const netlifySuccess = updateNetlifyToml();
  
  // Aggiorna il file di configurazione Supabase
  const configSuccess = updateSupabaseConfig();
  
  console.log('\n==========================================');
  
  if (envSuccess && netlifySuccess && configSuccess) {
    console.log('✅ Configurazione Supabase aggiornata con successo!');
  } else {
    console.log('⚠️ Configurazione Supabase aggiornata con alcuni errori');
  }
  
  console.log('==========================================');
}

// Esegui l'aggiornamento della configurazione
updateSupabaseConfiguration(); 