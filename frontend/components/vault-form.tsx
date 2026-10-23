"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

export function VaultForm() {
  const signer = ccc.useSigner();

  const [amount, setAmount] = useState("");
  const [lockDays, setLockDays] = useState("1");
  const [walletBalance, setWalletBalance] =
    useState<bigint | null>(null);

  const minimumAmount = 500;

  useEffect(() => {
    async function loadBalance() {
      if (!signer) {
        setWalletBalance(null);
        return;
      }

      const balance =
        await signer.getBalance();

      setWalletBalance(balance);
    }

    loadBalance();
  }, [signer]);

  const balanceInCkb =
    walletBalance !== null
      ? Number(walletBalance) / 100_000_000
      : 0;

  const numericAmount =
    Number(amount);

  const numericLockDays =
    Number(lockDays);

  const isAmountEmpty =
    amount.trim() === "";

  const isAmountNumber =
    Number.isFinite(numericAmount);

  const isAmountWhole =
    Number.isInteger(numericAmount);

  const isBelowMinimum =
    numericAmount < minimumAmount;

  const isAboveBalance =
    numericAmount > balanceInCkb;

  const isLockDaysValid =
    Number.isInteger(numericLockDays) &&
    numericLockDays >= 1 &&
    numericLockDays <= 7;

  const isAmountValid =
    !isAmountEmpty &&
    isAmountNumber &&
    isAmountWhole &&
    !isBelowMinimum &&
    !isAboveBalance;

  const isFormValid =
    signer !== undefined &&
    isAmountValid &&
    isLockDaysValid;

  return (
    <section className="mt-8 w-full max-w-md rounded-xl border border-zinc-200 p-5">
      <h2 className="text-xl font-semibold">
        Create Vault
      </h2>

      <p className="mt-1 text-sm text-zinc-500">
        Lock CKB for between 1 and 7 days.
      </p>

      <div className="mt-6">
        <label
          htmlFor="vault-amount"
          className="block text-sm font-medium"
        >
          Amount to lock
        </label>

        <input
          id="vault-amount"
          type="number"
          min={minimumAmount}
          step="1"
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value)
          }
          placeholder="500"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none"
        />

        <p className="mt-2 text-sm text-zinc-500">
          Minimum: {minimumAmount} CKB
        </p>

        {walletBalance !== null && (
          <p className="mt-1 text-sm text-zinc-500">
            Wallet balance:{" "}
            {balanceInCkb.toLocaleString()} CKB
          </p>
        )}

        {!isAmountEmpty &&
          !isAmountWhole && (
            <p className="mt-2 text-sm text-red-600">
              Enter a whole CKB amount.
            </p>
          )}

        {!isAmountEmpty &&
          isAmountWhole &&
          isBelowMinimum && (
            <p className="mt-2 text-sm text-red-600">
              Minimum amount is 500 CKB.
            </p>
          )}

        {!isAmountEmpty &&
          isAmountWhole &&
          isAboveBalance && (
            <p className="mt-2 text-sm text-red-600">
              Amount exceeds wallet balance.
            </p>
          )}
      </div>

      <div className="mt-6">
        <label
          htmlFor="lock-days"
          className="block text-sm font-medium"
        >
          Lock duration
        </label>

        <input
          id="lock-days"
          type="number"
          min="1"
          max="7"
          step="1"
          value={lockDays}
          onChange={(event) =>
            setLockDays(event.target.value)
          }
          className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none"
        />

        <p className="mt-2 text-sm text-zinc-500">
          Minimum: 1 day · Maximum: 7 days
        </p>

        {!isLockDaysValid && (
          <p className="mt-2 text-sm text-red-600">
            Lock duration must be between 1 and 7 days.
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={!isFormValid}
        className="mt-6 w-full rounded-lg bg-black px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Create Vault
      </button>
    </section>
  );
}