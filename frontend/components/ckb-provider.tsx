"use client";

import { ccc } from "@ckb-ccc/connector-react";

type CkbProviderProps = {
  children: React.ReactNode;
};

export function CkbProvider({
  children,
}: CkbProviderProps) {
  return (
    <ccc.Provider name="CKB Vault">
      {children}
    </ccc.Provider>
  );
}