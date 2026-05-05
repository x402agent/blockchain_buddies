# Blockchain Buddies

Blockchain Buddies is a Solana-native companion gallery and birth station for OpenClawd agents.

Users can browse approved buddies, preview animation states, and mint a new buddy onchain at birth. Each onchain birth uses Helius RPC and the Metaplex Agent Registry API to create an MPL Core asset and register the buddy as a verifiable agent identity in one transaction.

## Features

- Browse approved Blockchain Buddy packs
- Preview every animation state
- Download individual ZIP packages
- Submit community buddy packages in the browser
- Mint a buddy on Solana as a registered Metaplex Agent
- Persist asset address, transaction signature, metadata URI, and owner context in Postgres
- Use OpenClawd as the agent framework for services, identity, and future execution

## Onchain Birth Flow

1. User opens `/birth`.
2. User provides a buddy name, description, public Core asset metadata URI, optional image URL, and owner wallet.
3. The server signs with `BUDDIES_MINT_AUTHORITY_SECRET_KEY`.
4. Umi submits through `HELIUS_RPC_URL` or `HELIUS_API_KEY`.
5. `mintAndSubmitAgent` calls `https://api.metaplex.com/v1/agents/mint`, signs the returned transaction, and confirms it on Solana.
6. The app stores the buddy in `blockchain_buddies` with the Metaplex Core asset address and transaction signature.

## Metaplex Requirements

- A funded Solana mint authority with enough SOL for Core asset rent and transaction fees
- A public metadata JSON URI for each buddy
- `@metaplex-foundation/mpl-agent-registry` v0.2+
- `@metaplex-foundation/umi`
- `@metaplex-foundation/umi-bundle-defaults`
- Helius or another reliable Solana RPC endpoint

## Environment

```bash
DATABASE_URL=
HELIUS_RPC_URL=
HELIUS_API_KEY=
METAPLEX_AGENT_NETWORK=solana-mainnet
BUDDIES_MINT_AUTHORITY_SECRET_KEY=
```

`BUDDIES_MINT_AUTHORITY_SECRET_KEY` accepts either a base58 secret key or a JSON array keypair.

## Development

```bash
bun install
bun dev
```

## Production

```bash
bun run build
```

Buddy packages still live under `public/pets` for compatibility with the existing animation pipeline. Downloadable archives are generated under `public/packs`.
