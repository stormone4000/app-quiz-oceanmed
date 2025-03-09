#!/usr/bin/env node

/**
 * Database Connector - Script avanzato per la gestione delle connessioni al database
 * 
 * Questo script fornisce funzionalità per:
 * - Connessione al database remoto o locale
 * - Test della connessione e verifica dell'accesso
 * - Visualizzazione delle informazioni sul database
 * - Diagnostica delle connessioni
 * 
 * Utilizzo:
 * node databaseConnector.js [options]
 * 
 * Opzioni:
 *  --remote         Connessione al database remoto (default)
 *  --local          Connessione al database locale
 *  --test           Testa la connessione senza connettersi
 *  --info           Mostra informazioni sul database
 *  --tables         Elenca le tabelle nel database
 *  --diagnose       Esegue una diagnostica completa
 */

const { execSync, exec } = require('child_process');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Caricamento della configurazione
const configPath = path.join(process.cwd(), 'db-connection.config.js');
let config;

try {
  config = require(configPath);
} catch (err) {
  console.error(`Errore nel caricamento della configurazione: ${err.message}`);
  console.error('Assicurati che il file db-connection.config.js esista nella directory principale del progetto.');
  process.exit(1);
}

// Parsing degli argomenti
const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const testOnly = args.includes('--test');
const showInfo = args.includes('--info');
const listTables = args.includes('--tables');
const diagnose = args.includes('--diagnose');

// Configurazione della connessione
const connectionConfig = useLocal ? {
  type: 'local',
  command: config.connectLocal,
  url: 'http://127.0.0.1:54321'
} : {
  type: 'remote',
  command: config.connectWithMCP,
  url: config.supabase.url
};

// Funzione per testare la connessione
async function testConnection() {
  console.log(`\nTesting della connessione al database ${connectionConfig.type}...`);
  
  try {
    // Test di base con ping
    if (connectionConfig.type === 'remote') {
      console.log(`Ping a ${new URL(connectionConfig.url).hostname}...`);
      execSync(`ping -c 1 ${new URL(connectionConfig.url).hostname}`);
      console.log('✅ Host raggiungibile');
    } else {
      console.log('Connessione locale...');
    }
    
    // Test dell'API Supabase
    console.log(`Test dell'API Supabase su ${connectionConfig.url}...`);
    try {
      const response = await fetch(`${connectionConfig.url}/rest/v1/`, {
        headers: {
          'apikey': config.supabase.anonKey,
          'Authorization': `Bearer ${config.supabase.anonKey}`
        }
      });
      
      if (response.ok) {
        console.log('✅ API Supabase accessibile');
      } else {
        console.log(`❌ API Supabase non accessibile: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.log(`❌ Errore nella connessione all'API: ${err.message}`);
    }
    
    console.log('\nTest completato.');
  } catch (err) {
    console.error(`❌ Errore durante il test: ${err.message}`);
  }
}

// Funzione per mostrare informazioni
function showDatabaseInfo() {
  console.log('\nInformazioni sulla connessione al database:');
  console.log('------------------------------------------');
  console.log(`Tipo: ${connectionConfig.type}`);
  console.log(`URL: ${connectionConfig.url}`);
  
  if (connectionConfig.type === 'remote') {
    console.log('\nCredenziali Supabase:');
    console.log(`Chiave anonima: ${config.supabase.anonKey.substring(0, 20)}...`);
    console.log(`Chiave di servizio: ${config.supabase.serviceKey.substring(0, 20)}...`);
  }
  
  console.log('\nComando di connessione:');
  console.log(connectionConfig.command);
}

// Funzione principale
async function main() {
  // Mostra banner
  console.log('=============================================');
  console.log('         DATABASE CONNECTOR UTILITY          ');
  console.log('=============================================');
  
  // Esegui azioni in base agli argomenti
  if (showInfo || diagnose) {
    showDatabaseInfo();
  }
  
  if (testOnly || diagnose) {
    await testConnection();
  }
  
  if (listTables) {
    console.log('\nPer visualizzare le tabelle, è necessario connettersi al database.');
    console.log('Connessione in corso...');
    
    // Questo è un approccio semplificato, nella pratica
    // si dovrebbe usare una libreria client SQL per PostgreSQL
  }
  
  // Se non ci sono flag particolari o c'è --diagnose, connettiti
  if ((!testOnly && !showInfo && !listTables) || diagnose) {
    console.log(`\nConnessione al database ${connectionConfig.type}...`);
    console.log('------------------------------------------');
    
    const connection = exec(connectionConfig.command);
    
    connection.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    connection.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    connection.on('close', (code) => {
      console.log(`\nConnessione terminata con codice: ${code}`);
    });
    
    // Gestisci interruzione
    process.on('SIGINT', () => {
      connection.kill('SIGINT');
      console.log('\nConnessione interrotta manualmente');
      process.exit(0);
    });
  }
}

// Esegui il programma
main().catch(err => {
  console.error(`Errore nell'esecuzione: ${err.message}`);
  process.exit(1);
}); 