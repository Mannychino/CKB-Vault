"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

import {
  openDevnetClient,
} from "@/lib/ckb/devnet-client";

type CkbProviderProps = {
  children: React.ReactNode;
};

export function CkbProvider({
  children,
}: CkbProviderProps) {
  const [client, setClient] =
    useState<ccc.Client | null>(null);

  useEffect(() => {
    const clientOwner =
      openDevnetClient();

    setClient(
      clientOwner.value,
    );

    return () => {
      void clientOwner.dispose();
    };
  }, []);

  if (!client) {
    return (
      <div className="p-6">
        Connecting to local CKB devnet...
      </div>
    );
  }

  return (
    <ccc.Provider
      name="CKB Vault"
      defaultClient={client}
    >
      {children}
    </ccc.Provider>
  );
}