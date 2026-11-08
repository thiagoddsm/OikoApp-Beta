import React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function MoldeDeServoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
