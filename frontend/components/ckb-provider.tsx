"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

import {
  getCkbNetwork,
} from "@/lib/ckb/networks";

import {
  openCkbClient,
} from "@/lib/ckb/client";

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
  openCkbClient();

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
  Connecting to CKB {getCkbNetwork()}...
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