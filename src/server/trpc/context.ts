import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function createContext(req?: NextRequest) {
  const { userId } = await auth();
  
  return {
    req,
    userId: userId ?? undefined,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
