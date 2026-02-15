"use client";

import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { LivepeerService, IrysService } from '@/types/services';
import { livepeerServiceImpl } from '@/lib/livepeer';
import { irysServiceImpl } from '@/lib/irys';

interface ServiceContextType {
  livepeer: LivepeerService;
  irys: IrysService;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export function ServiceProvider({ children }: PropsWithChildren) {
  const services = useMemo<ServiceContextType>(() => ({
    livepeer: livepeerServiceImpl,
    irys: irysServiceImpl,
  }), []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useServiceContext(): ServiceContextType {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServiceContext must be used within ServiceProvider');
  }
  return ctx;
}
