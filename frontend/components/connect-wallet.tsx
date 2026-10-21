"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

export function ConnectWallet() {
  const { open } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [address, setAddress] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadAddress() {
      if (!signer) {
        setAddress(null);
        return;
      }

      const signerAddress =
        await signer.getRecommendedAddress();

      setAddress(signerAddress);
    }

    loadAddress();
  }, [signer]);

  if (address) {
    return (
      <div>
        <p className="text-sm text-zinc-500">
          Connected wallet
        </p>

        <p className="mt-1 font-mono text-sm">
          {address}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={open}
      className="rounded-lg bg-black px-4 py-2 text-white"
    >
      Connect Wallet
    </button>
  );
}