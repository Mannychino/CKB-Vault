import { ConnectWallet } from "@/components/connect-wallet";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div>
        <h1 className="text-4xl font-bold">Welcome to CKB Vault</h1>

        <p className="mt-2 text-zinc-600">
          Locked CKB for a fixed period of time to earn rewards. The longer you lock, the more you earn.
        </p>

        <div className="mt-4">
          <ConnectWallet />
          </div>
      </div>
    </main>
  );
}