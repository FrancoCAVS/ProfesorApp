import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, children, className }: PageHeaderProps) {
  return (
    <header className={cn(
      "relative z-10 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 border-b bg-card px-4 md:px-8 py-4",
      className
    )}>
      <h1 className="text-2xl font-bold font-headline text-primary shrink-0">{title}</h1>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto md:justify-end">
        {children}
      </div>
    </header>
  );
}
