import React from 'react';
import { 
  Compass, 
  Book, 
  Video, 
  Users, 
  MessageCircle, 
  LifeBuoy,
  CheckCircle2
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Compass className="w-6 h-6 text-blue-600" />,
    title: 'Quiz Interattivi',
    description: 'Preparati con quiz personalizzati e simulazioni d\'esame realistiche'
  },
  {
    icon: <Video className="w-6 h-6 text-blue-600" />,
    title: 'Video Lezioni',
    description: 'Accedi a video lezioni professionali per approfondire ogni argomento'
  },
  {
    icon: <Book className="w-6 h-6 text-blue-600" />,
    title: 'Materiale Didattico',
    description: 'Consulta materiale didattico completo e sempre aggiornato'
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: 'Supporto Istruttori',
    description: 'Ricevi supporto diretto dai nostri istruttori qualificati'
  },
  {
    icon: <MessageCircle className="w-6 h-6 text-blue-600" />,
    title: 'Community',
    description: 'Unisciti alla nostra community di studenti e condividi esperienze'
  },
  {
    icon: <LifeBuoy className="w-6 h-6 text-blue-600" />,
    title: 'Supporto 24/7',
    description: 'Assistenza tecnica e supporto disponibile 24 ore su 24'
  }
];

export function PricingFeatures() {
  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Tutto ciò di cui hai bisogno per superare l'esame
          </h2>
          <p className="text-lg text-gray-600">
            Accedi a strumenti e risorse professionali per la tua preparazione
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Garanzia soddisfatti o rimborsati entro 30 giorni</span>
          </div>
        </div>
      </div>
    </div>
  );
}