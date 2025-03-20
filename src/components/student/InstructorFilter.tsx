import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface InstructorFilterProps {
  onFilterChange: (instructorId: string | null) => void;
  className?: string;
}

interface Instructor {
  id: string;
  business_name: string;
  email: string;
}

export function InstructorFilter({ onFilterChange, className = '' }: InstructorFilterProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carica tutti gli istruttori disponibili
  useEffect(() => {
    const loadInstructors = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('instructor_profiles')
          .select('id, business_name, email')
          .order('business_name', { ascending: true });

        if (error) {
          console.error('Errore nel caricamento degli istruttori:', error);
          return;
        }

        setInstructors(data || []);
      } catch (error) {
        console.error('Errore imprevisto:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInstructors();
  }, []);

  // Gestisce il cambio di selezione dell'istruttore
  const handleInstructorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instructorId = e.target.value === 'all' ? null : e.target.value;
    setSelectedInstructorId(instructorId);
    onFilterChange(instructorId);
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label htmlFor="instructor-filter" className="text-sm font-medium text-gray-700">
        Filtra per Istruttore/Scuola
      </label>
      <select
        id="instructor-filter"
        value={selectedInstructorId || 'all'}
        onChange={handleInstructorChange}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        disabled={loading}
      >
        <option value="all">Tutti gli Istruttori</option>
        {instructors.map((instructor) => (
          <option key={instructor.id} value={instructor.id}>
            {instructor.business_name || instructor.email}
          </option>
        ))}
      </select>
      {loading && (
        <div className="text-sm text-gray-500">Caricamento istruttori...</div>
      )}
    </div>
  );
} 