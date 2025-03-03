import React from 'react';
import { 
  LogIn, 
  UserPlus, 
  Key, 
  Mail, 
  Lock, 
  AlertCircle, 
  Loader2,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  ArrowRight,
  RefreshCw,
  Play,
  CheckCircle,
  Settings,
  User
} from 'lucide-react';
import { supabase } from '../services/supabase';

// Tipi per le icone
type IconProps = React.ComponentProps<typeof LogIn>;
type IconType = React.ComponentType<IconProps>;

// Mappatura delle icone Lucide
export const Icons = {
  // Autenticazione
  login: LogIn,
  register: UserPlus,
  key: Key,
  mail: Mail,
  lock: Lock,
  alert: AlertCircle,
  loader: Loader2,
  back: ArrowLeft,
  
  // Navigazione
  arrowRight: ArrowRight,
  
  // Ruoli
  student: BookOpen,
  instructor: GraduationCap,
  
  // Azioni
  refresh: RefreshCw,
  play: Play,
  check: CheckCircle,
  settings: Settings,
  user: User,
  
  // Funzione per ottenere un'icona personalizzata da Supabase
  getCustomIcon: async (iconName: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .storage
        .from('icons') // Nome del bucket contenente le icone
        .getPublicUrl(`${iconName}`);
      
      return data.publicUrl;
    } catch (err) {
      console.error(`Errore durante il recupero dell'icona ${iconName}:`, err);
      return null;
    }
  }
};

// Componente wrapper per icone con stili predefiniti
interface IconWrapperProps extends React.ComponentProps<IconType> {
  icon: IconType;
  className?: string;
}

export const IconWrapper = ({ 
  icon: Icon, 
  className = "h-5 w-5", 
  ...props 
}: IconWrapperProps) => {
  return <Icon className={className} {...props} />;
};

// Componente per le icone caricate da Supabase
interface CustomIconProps {
  src: string;
  alt: string;
  className?: string;
}

export const CustomIcon = ({ 
  src, 
  alt, 
  className = "h-5 w-5" 
}: CustomIconProps) => {
  return <img src={src} alt={alt} className={className} />;
};

export default Icons; 