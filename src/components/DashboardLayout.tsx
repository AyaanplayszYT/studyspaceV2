import { ReactNode } from 'react';
import { DynamicIsland } from './DynamicIsland';
import { AIChatFloatingDraggable } from './AIChatFloatingDraggable';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen w-full">
      <DynamicIsland />
      <div className="hidden md:block">
        <AIChatFloatingDraggable />
      </div>
      <main className="pt-24 px-6 pb-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
};
