"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type MintedBuddy = {
  id: string;
  name: string;
  assetAddress: string;
  signature: string;
  network: string;
  mintAuthority: string;
};

type MintResponse =
  | { ok: true; buddy: MintedBuddy }
  | { error: string; message?: string };

const EXPLORER_CLUSTER: Record<string, string> = {
  "solana-devnet": "?cluster=devnet",
  localnet: "?cluster=custom",
};

function explorerTx(signature: string, network: string) {
  return `https://explorer.solana.com/tx/${signature}${EXPLORER_CLUSTER[network] ?? ""}`;
}

function explorerAddress(address: string, network: string) {
  return `https://explorer.solana.com/address/${address}${EXPLORER_CLUSTER[network] ?? ""}`;
}

export function BuddyMintForm() {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [personality, setPersonality] = useState("");
  const [description, setDescription] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ownerWallet, setOwnerWallet] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<MintedBuddy | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMinted(null);

    try {
      const response = await fetch("/api/buddies/mint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          species,
          personality,
          description,
          metadataUri,
          imageUrl,
          ownerWallet,
        }),
      });
      const json = (await response.json()) as MintResponse;
      if (!response.ok || "error" in json) {
        setError(
          "message" in json && json.message ? json.message : "Mint failed.",
        );
        return;
      }
      setMinted(json.buddy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mint failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-border-base bg-surface/85 p-6 shadow-xl shadow-blue-950/10 backdrop-blur md:p-8"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Buddy name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-2xl border border-border-base bg-background px-4 text-sm outline-none transition focus:border-brand"
            placeholder="Clawd Scout"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Species
          <input
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
            className="h-11 rounded-2xl border border-border-base bg-background px-4 text-sm outline-none transition focus:border-brand"
            placeholder="Solana lobster, analyst, guardian..."
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
          Personality / mission
          <input
            value={personality}
            onChange={(event) => setPersonality(event.target.value)}
            className="h-11 rounded-2xl border border-border-base bg-background px-4 text-sm outline-none transition focus:border-brand"
            placeholder="Watches wallets, explains swaps, and nudges safer trades."
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-28 rounded-2xl border border-border-base bg-background px-4 py-3 text-sm outline-none transition focus:border-brand"
            placeholder="Describe what this buddy does as an autonomous OpenClawd agent."
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground md:col-span-2">
          Core asset metadata URI
          <input
            value={metadataUri}
            onChange={(event) => setMetadataUri(event.target.value)}
            className="h-11 rounded-2xl border border-border-base bg-background px-4 text-sm outline-none transition focus:border-brand"
            placeholder="https://arweave.net/.../buddy.json"
            required
          />
          <span className="text-xs font-normal text-muted-3">
            Public JSON metadata for the MPL Core asset. Use Arweave, Irys,
            IPFS, or another durable public host before minting.
          </span>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Image URL
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="h-11 rounded-2xl border border-border-base bg-background px-4 text-sm outline-none transition focus:border-brand"
            placeholder="https://arweave.net/.../buddy.png"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Owner wallet
          <input
            value={ownerWallet}
            onChange={(event) => setOwnerWallet(event.target.value)}
            className="h-11 rounded-2xl border border-border-base bg-background px-4 text-sm outline-none transition focus:border-brand"
            placeholder="Optional Solana wallet to associate offchain"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-inverse px-6 text-sm font-medium text-on-inverse transition hover:bg-inverse-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Minting on Solana..." : "Birth onchain with Metaplex"}
      </button>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {minted ? (
        <div className="mt-5 rounded-2xl border border-brand/30 bg-brand-tint/70 p-4 text-sm dark:bg-brand-tint-dark/60">
          <p className="font-semibold text-foreground">
            {minted.name} is live as a Metaplex Agent.
          </p>
          <div className="mt-3 grid gap-2 font-mono text-xs text-muted-2">
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href={explorerAddress(minted.assetAddress, minted.network)}
              target="_blank"
              rel="noreferrer"
            >
              Asset: {minted.assetAddress}
            </a>
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href={explorerTx(minted.signature, minted.network)}
              target="_blank"
              rel="noreferrer"
            >
              Tx: {minted.signature}
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}
