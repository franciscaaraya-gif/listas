'use client';
import { Suspense } from 'react';
import EnrollPage from './EnrollPage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EnrollPage />
    </Suspense>
  );
}