'use client';

import React from 'react';
import { ServosManagementView } from '@/components/volunteering/servos-management-view';

export default function ServosPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <ServosManagementView />
    </div>
  );
}
