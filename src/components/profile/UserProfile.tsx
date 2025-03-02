import React from 'react';
import { ProfileLayout } from './ProfileLayout';

interface UserProfileProps {
  userEmail: string;
  needsSubscription?: boolean;
}

export function UserProfile({ userEmail, needsSubscription }: UserProfileProps) {
  const isInstructor = localStorage.getItem('isProfessor') === 'true';
  const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';

  return (
    <ProfileLayout
      userEmail={userEmail}
      isInstructor={isInstructor}
      isMasterAdmin={isMasterAdmin}
      needsSubscription={needsSubscription}
    />
  );
}