"use client";

import { useEffect, useState } from "react";
import { ccc } from "@ckb-ccc/connector-react";

import {
  estimateAverageBlockSeconds,
} from "@/lib/block-time";

import {
  daysToRelativeBlocks,
} from "@/lib/vault-time";

import {
  createVault,
} from "@/lib/ckb/create-vault";

export function VaultForm() {
  const signer = ccc.useSigner();
  const { client } = ccc.useCcc();

  const [amount, setAmount] =
    useState("");

  const [lockDays, setLockDays] =
    useState("1");

  const [
    walletBalance,
    setWalletBalance,
  ] = useState<bigint | null>(null);

  const [
    averageBlockSeconds,
    setAverageBlockSeconds,
  ] = useState<number | null>(null);

  const [
    requiredBlocks,
    setRequiredBlocks,
  ] = useState<bigint | null>(null);

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    txHash,
    setTxHash,
  ] = useState<string | null>(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const minimumAmount = 500;

  useEffect(() => {
    async function loadBalance() {
      if (!signer) {
        setWalletBalance(null);
        return;
      }

      try {
        const balance =
          await signer.getBalance();

        setWalletBalance(balance);
      } catch (error) {
        console.error(
          "Failed to load wallet balance:",
          error,
        );

        setWalletBalance(null);
      }
    }

    loadBalance();
  }, [signer]);

  const balanceInCkb =
    walletBalance !== null
      ? Number(walletBalance) /
        100_000_000
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
    /^\d+$/.test(amount.trim());

  const isBelowMinimum =
    numericAmount < minimumAmount;

  const isAboveBalance =
    numericAmount > balanceInCkb;

  const isLockDaysValid =
    Number.isInteger(
      numericLockDays,
    ) &&
    numericLockDays >= 1 &&
    numericLockDays <= 7;

  const isAmountValid =
    !isAmountEmpty &&
    isAmountNumber &&
    isAmountWhole &&
    !isBelowMinimum &&
    !isAboveBalance;

  useEffect(() => {
    async function calculateVaultTiming() {
      if (!isLockDaysValid) {
        setAverageBlockSeconds(null);
        setRequiredBlocks(null);
        return;
      }

      try {
        const average =
          await estimateAverageBlockSeconds(
            client,
          );

        const blocks =
          daysToRelativeBlocks(
            numericLockDays,
            average,
          );

        setAverageBlockSeconds(
          average,
        );

        setRequiredBlocks(
          blocks,
        );
      } catch (error) {
        console.error(
          "Failed to calculate vault timing:",
          error,
        );

        setAverageBlockSeconds(null);
        setRequiredBlocks(null);
      }
    }

    calculateVaultTiming();
  }, [
    client,
    numericLockDays,
    isLockDaysValid,
  ]);

  const isFormValid =
    signer !== undefined &&
    isAmountValid &&
    isLockDaysValid &&
    requiredBlocks !== null &&
    !isCreating;

  async function handleCreateVault() {
    if (!signer) {
      setError(
        "Connect your wallet before creating a Vault.",
      );
      return;
    }

    if (!isAmountValid) {
      setError(
        "Enter a valid CKB amount.",
      );
      return;
    }

    if (
      !isLockDaysValid ||
      requiredBlocks === null
    ) {
      setError(
        "Enter a valid lock duration.",
      );
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setTxHash(null);

      const amountCkb =
        BigInt(amount.trim());

      const hash = await createVault({
          signer,
          amountCkb,
          requiredBlocks,
        });

      setTxHash(hash);
    } catch (error) {  console.error(  "Failed to create Vault:",  error, );

      if (
        error instanceof Error ) {
        setError(error.message);
      } else {
        setError(
          "Failed to create Vault transaction.",
        );
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="mt-8 w-full max-w-md rounded-xl border border-zinc-200 p-5">
      <h2 className="text-xl font-semibold">
        Create Vault
      </h2>

      <h2 className="text-xl font-semibold">
  Create Vault TEST
</h2>


      <p className="mt-1 text-sm text-zinc-500">
        Lock CKB for between 1 and
        7 days.
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
          onChange={(event) => {
            setAmount(
              event.target.value,
            );

            setTxHash(null);
            setError(null);
          }}
          placeholder="500"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none"
        />

        <p className="mt-2 text-sm text-zinc-500">
          Minimum: {minimumAmount} CKB
        </p>

        {walletBalance !== null && (
          <p className="mt-1 text-sm text-zinc-500">
            Wallet balance:{" "}
            {balanceInCkb.toLocaleString()}{" "}
            CKB
          </p>
        )}

        {!isAmountEmpty &&
          !isAmountWhole && (
            <p className="mt-2 text-sm text-red-600">
              Enter a whole CKB
              amount.
            </p>
          )}

        {!isAmountEmpty &&
          isAmountWhole &&
          isBelowMinimum && (
            <p className="mt-2 text-sm text-red-600">
              Minimum amount is 500
              CKB.
            </p>
          )}

        {!isAmountEmpty &&
          isAmountWhole &&
          isAboveBalance && (
            <p className="mt-2 text-sm text-red-600">
              Amount exceeds wallet
              balance.
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
          onChange={(event) => {
            setLockDays(
              event.target.value,
            );

            setTxHash(null);
            setError(null);
          }}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 outline-none"
        />

        <p className="mt-2 text-sm text-zinc-500">
          Minimum: 1 day · Maximum: 7
          days
        </p>

        {!isLockDaysValid && (
          <p className="mt-2 text-sm text-red-600">
            Lock duration must be
            between 1 and 7 days.
          </p>
        )}

        {averageBlockSeconds !== null &&
          requiredBlocks !== null && (
            <div className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm">
              <p>
                Estimated block
                interval:{" "}
                {averageBlockSeconds.toFixed(
                  2,
                )}{" "}
                seconds
              </p>

              <p className="mt-1">
                Required relative
                blocks:{" "}
                {requiredBlocks.toString()}
              </p>
            </div>
          )}
      </div>

      <button
        type="button"
        disabled={!isFormValid}
        onClick={
          handleCreateVault
        }
        className="mt-6 w-full rounded-lg bg-black px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isCreating
          ? "Creating Vault..."
          : "Create Vault"}
      </button>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {txHash && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">
            Vault transaction
            submitted
          </p>

          <p className="mt-2 break-all font-mono text-xs text-green-700">
            {txHash}
          </p>
        </div>
      )}
    </section>
  );
}



    



  




