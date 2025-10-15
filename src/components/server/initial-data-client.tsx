/**
 * Client Component that receives server-fetched initial data.
 * 
 * Creates a React Context to make server-fetched data available
 * throughout the client component tree without prop drilling.
 */

"use client";

import { createContext, useContext, ReactNode } from "react";

type InitialData = {
  user: any | null;
  quota: any | null;
  projects: any[];
  isAuthenticated: boolean;
};

const InitialDataContext = createContext<InitialData | null>(null);

/**
 * Hook to access server-fetched initial data in client components.
 * 
 * @returns Initial data object with user, quota, and projects
 * @throws Error if used outside InitialDataClient provider
 */
export function useInitialData() {
  const context = useContext(InitialDataContext);
  if (!context) {
    throw new Error("useInitialData must be used within InitialDataClient");
  }
  return context;
}

/**
 * Client wrapper that provides server-fetched data via React Context.
 * 
 * @param initialData - Data pre-fetched on the server
 * @param children - Child components that can access the data
 */
export function InitialDataClient({
  initialData,
  children,
}: {
  initialData: InitialData;
  children: ReactNode;
}) {
  return (
    <InitialDataContext.Provider value={initialData}>
      {children}
    </InitialDataContext.Provider>
  );
}
