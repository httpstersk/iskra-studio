import React from "react";

import { createProxyFalClient } from "@/lib/fal/utils";

// Custom hook for FAL client
export const useFalClient = (apiKey?: string) => {
  return React.useMemo(() => {
    return createProxyFalClient(apiKey);
  }, [apiKey]);
};
