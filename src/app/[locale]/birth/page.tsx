import { ShieldCheck, Sparkles, WalletCards } from "lucide-react";

import { buildLocaleAlternates } from "@/lib/locale-routing";

import { BuddyMintForm } from "@/components/buddy-mint-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Birth a Blockchain Buddy | Blockchain Buddies",
  description:
    "Mint a Blockchain Buddy as a registered Metaplex Agent on Solana using OpenClawd and Helius RPC.",
  alternates: buildLocaleAlternates("/birth"),
};

export default function BirthPage() {
  return (
    <main className="petdex-cloud min-h-dvh bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-5 pb-14 md:px-8">
        <SiteHeader />

        <header className="mt-8 grid gap-8 md:grid-cols-[1fr_420px] md:items-end">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-brand uppercase">
              Onchain birth certificate
            </p>
            <h1 className="mt-3 max-w-3xl text-5xl leading-tight font-semibold tracking-tight md:text-7xl">
              Mint a Blockchain Buddy on Solana.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-2">
              Each buddy is created as an MPL Core asset and registered through
              the Metaplex Agent Registry in one atomic transaction. Helius RPC
              powers submission, OpenClawd supplies the agent framework, and the
              returned Core asset address becomes the buddy&apos;s permanent
              onchain identity.
            </p>
          </div>

          <div className="rounded-3xl border border-border-base bg-surface/80 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-foreground">
              Before minting
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-2">
              <li className="flex gap-2">
                <WalletCards className="mt-1 size-4 shrink-0 text-brand" />
                Fund the server mint authority with SOL for Core asset rent and
                transaction fees.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-1 size-4 shrink-0 text-brand" />
                Set `HELIUS_RPC_URL` and `BUDDIES_MINT_AUTHORITY_SECRET_KEY` in
                the deployment environment.
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-1 size-4 shrink-0 text-brand" />
                Host metadata JSON publicly before birth; Metaplex stores the
                URI on the Core asset.
              </li>
            </ul>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-border-base bg-surface/75 p-5 backdrop-blur">
            <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
              Agent onboarding
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Canonical Metaplex flow
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-2">
              Blockchain Buddies follows the Metaplex Agent Onboarding path:
              funded wallet, RPC setup, Core asset registration, identity PDA,
              agent wallet activation, optional delegation, and optional token
              launch.
            </p>
          </article>

          <article className="rounded-3xl border border-border-base bg-surface/75 p-5 backdrop-blur">
            <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
              Mint an agent
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Born as a Core asset
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-2">
              The server calls <code>mintAndSubmitAgent</code> from the Metaplex
              Agent Registry SDK. The Metaplex API stores agent metadata,
              returns an unsigned transaction, and the OpenClawd mint authority
              signs it through Umi.
            </p>
          </article>

          <article className="rounded-3xl border border-border-base bg-surface/75 p-5 backdrop-blur">
            <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
              Run on Solana
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Wallet, delegation, token
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-2">
              The returned Core asset address derives the buddy&apos;s Asset
              Signer PDA wallet. That identity can later be delegated to an
              executive profile or bound to a Genesis agent token.
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-border-base bg-surface/80 p-6 backdrop-blur md:p-7">
          <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>
              <p className="font-mono text-xs tracking-[0.18em] text-brand uppercase">
                What this page automates
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                A verifiable onchain birth record.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-2">
                Use this page when an OpenClawd operator or agent has a funded
                Solana authority and a public metadata URI ready. The flow
                records the mint in the app database so the hub can track the
                buddy, owner, asset address, transaction signature, RPC
                provider, and Metaplex network.
              </p>
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-muted-2">
              <li>
                <strong className="text-foreground">Prerequisite:</strong> a
                funded Solana wallet with enough SOL for Core asset rent and
                transaction fees.
              </li>
              <li>
                <strong className="text-foreground">Mainnet:</strong> configure
                a dedicated Helius RPC URL; the public devnet endpoint is only
                suitable for testing.
              </li>
              <li>
                <strong className="text-foreground">Permanent identity:</strong>{" "}
                each successful birth creates a new agent asset. Calling the
                mint flow twice creates two different buddies.
              </li>
              <li>
                <strong className="text-foreground">Next step:</strong> derive
                the Asset Signer PDA, register an executive profile, then
                delegate execution or launch a Genesis bonding-curve token.
              </li>
            </ul>
          </div>
        </section>

        <BuddyMintForm />
      </section>
      <SiteFooter />
    </main>
  );
}
