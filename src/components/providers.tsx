"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1A1A1E",
            color: "#EBEBEB",
            border: "1px solid rgba(240,184,35,0.3)",
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}