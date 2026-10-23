"use client"

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

export function ConnectWallet() {
  const {open, disconnect, wallet, signerInfo,} = ccc.useCcc();
  
  const [address, setAddress] = useState<string | null>(null);

  const [balance, setBalance] = useState<bigint | null>(null);

  useEffect(() => {
    async function loadWalletData() {
      if (!signerInfo) {
        setAddress(null);
        setBalance(null);
        return;
      }
      
      const signer = signerInfo.signer;
      const signerAddress = await signer.getRecommendedAddress();

      const signerBalance = await signer.getBalance(); 
      
      setAddress(signerAddress);
      setBalance(signerBalance);
    }

    loadWalletData();
  }, [signerInfo]);


  if (!signerInfo) {
    return (
      <button type="button" onClick={open} className="rounded-lg bg-black px-4 py-2 text-white">
        Connect Wallet
      </button>
    );
  }
  
  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">
            Connected Wallet
          </p>

          <p className="font-medium">
            {wallet?.name ?? "Wallet"}
          </p>
        </div>

        <button type="button" onClick={() => disconnect()}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          Disconnect
        </button>
        </div>

        {address && (
          <p className="mt-4 break-all font-mono text-sm">
            {address}
          </p>
        )}

        {balance !== null && (
          <p className="mt-2 text-sm text-zinc-600">
            Balance:{" "}
            {ccc.fixedPointToString(balance)} CKB
          </p>
        )}
        </div>

  );

}