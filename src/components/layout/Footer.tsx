import React from 'react';
import { ExternalLink } from 'lucide-react';

const APP_VERSION = '1.0.0'; // You can update this version as needed

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-4 px-6">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/sign/img/pittogramma.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWcvcGl0dG9ncmFtbWEuc3ZnIiwiaWF0IjoxNzM3MTU0NDc5LCJleHAiOjE3Njg2OTA0Nzl9.XnVOhPkrxbyNBSQcOLKsjOfcENryszcFrE5pjmqbwWs&t=2025-01-17T22%3A54%3A39.624Z"
              alt="OceanMed Logo"
              className="h-8 w-auto"
            />
            <p className="text-sm text-gray-600 dark:text-slate-400">
              D.M. 323 del 10 agosto 2021: i nuovi quiz per l'esame della Patente Nautica – Edizione 2022 – A cura di Scuola Nautica OceanMed Sailing, Policoro.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="https://www.oceanmedsailing.com/privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
            >
              Privacy Policy
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className="text-sm text-gray-500 dark:text-slate-500">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}