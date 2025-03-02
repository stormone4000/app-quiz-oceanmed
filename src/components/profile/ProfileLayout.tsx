import React from 'react';
import { StudentProfile } from './StudentProfile';
import { InstructorProfile } from './InstructorProfile';
import { AdminProfile } from './AdminProfile';

interface ProfileLayoutProps {
  userEmail: string;
  isInstructor?: boolean;
  isMasterAdmin?: boolean;
  needsSubscription?: boolean;
}

export function ProfileLayout({ userEmail, isInstructor, isMasterAdmin, needsSubscription }: ProfileLayoutProps) {
  if (isMasterAdmin) {
    return <AdminProfile userEmail={userEmail} />;
  }

  if (isInstructor) {
    return <InstructorProfile userEmail={userEmail} needsSubscription={needsSubscription} />;
  }

  return <StudentProfile userEmail={userEmail} />;
}