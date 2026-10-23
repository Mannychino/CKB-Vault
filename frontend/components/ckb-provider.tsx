"use client";

import { ccc } from "@ckb-ccc/connector-react";
import { useEffect, useState } from "react";

type CkbProviderProps = {
  children: React.ReactNode;
};

export function CkbProvider({
  children,
}: CkbProviderProps) {
  const [client, setClient] = useState<ccc.Client | null>(null);

  useEffect(()=> {
    const clientOwner = ccc.ClientPublicTestnet.open({
      urls: [
         "http://127.0.0.1:28114",
          "http://127.0.0.1:8114",
      ],
    });

    setClient(clientOwner.value);

    return () => {
      void clientOwner.dispose();
    };
    },[]);

   if(!client) {
    return (
      <div className="p-6">
        Connecting to local CKB devnet
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