import { ConnectWallet } from "@/components/connect-wallet";
import { VaultForm} from "@/components/vault-form";

export const instant = false;

export default function Home() {
  return(
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold"> Welcome To CKB Vault</h1>
        <p className="mt-2 text-zinc-500">Lock CKB Assets for a fixed period of time.</p>

        
        <div className="mt-4">
          <ConnectWallet />
        </div>

        <VaultForm />

        </div>
        </main>
  );
}





