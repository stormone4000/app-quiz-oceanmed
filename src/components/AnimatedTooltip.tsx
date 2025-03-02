import React from 'react';
import { motion } from 'framer-motion';

interface Person {
  id: number;
  name: string;
  designation: string;
  image: string;
}

export function AnimatedTooltip() {
  const people: Person[] = [
    {
      id: 1,
      name: "Antonio Marsano",
      designation: "CEO",
      image: "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//pic_antonio.jpg"
    },
    {
      id: 2,
      name: "Nicola Berardi",
      designation: "Istruttrice Senior",
      image: "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//pic_berardi.jpg"
    },
    {
      id: 3,
      name: "Renato",
      designation: "Studente",
      image: "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//pic_renato.jpeg"
    },
    {
      id: 4,
      name: "Scotty",
      designation: "Mascotte",
      image: "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//pic_scotti_.jpg"
    },
    {
      id: 5,
      name: "Tommaso",
      designation: "Istruttrice Senior",
      image: "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//pic_tommaso.jpg"
    }
  ];

  return (
    <div className="flex flex-row items-center justify-center mb-10 w-full">
      <div className="flex flex-row items-center justify-center mb-10 -space-x-4">
        {people.map((person) => (
          <AnimatedTooltipItem key={person.id} {...person} />
        ))}
      </div>
    </div>
  );
}

function AnimatedTooltipItem({ name, designation, image }: Omit<Person, "id">) {
  return (
    <div className="group relative flex">
      <motion.div
        className="flex items-center justify-center"
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
      >
        <img
          src={image}
          className="h-14 w-14 rounded-full border-2 border-white object-cover"
          alt={name}
        />

        <div className="absolute bottom-0 z-50 mb-20 flex min-w-max flex-col items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="whitespace-no-wrap relative z-10 rounded-lg bg-white p-4 text-sm leading-none text-black shadow-lg">
            <div className="font-bold">{name}</div>
            <div className="text-gray-500">{designation}</div>
          </div>
          <div className="h-4 w-4 -mt-2 rotate-45 bg-white" />
        </div>
      </motion.div>
    </div>
  );
}