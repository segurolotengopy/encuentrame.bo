import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm border border-gray-100 ${className}`} {...props} />;
}
