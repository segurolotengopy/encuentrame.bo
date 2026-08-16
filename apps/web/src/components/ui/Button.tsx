import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const styles: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-gray-300',
  secondary: 'bg-white text-brand border-2 border-brand hover:bg-teal-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-xl px-6 py-3 text-lg font-semibold transition-colors ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
