// app/Providers.tsx
"use client";

import { Provider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { store } from "@/store/store";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <Provider store={store}>
        {children}
      </Provider>
    </SessionProvider>
  );
}
