# OpenClawd Blockchain Buddies CLI

The OpenClawd Blockchain Buddies CLI installs, browses, submits, and exports buddy packages for the OpenClawd agent stack.

It includes four integration paths in one package:

- **OpenClawd**: installs buddies into `~/.openclawd/buddies`.
- **Metaplex**: generates Agent Registry metadata for Solana onchain identity flows.
- **OpenAI Codex**: syncs buddies into the Codex-compatible `~/.codex/pets` format.
- **Petdex CLI compatibility**: keeps the legacy `petdex` binary and Petdex-compatible API environment variables.

## Install

```bash
npx @openclawdsolana/blockchain-buddies --help
npm install -g @openclawdsolana/blockchain-buddies
```

The package exposes these binaries:

- `blockchain-buddies` - primary OpenClawd command
- `buddies` - short alias
- `petdex` - legacy compatibility alias

## Quick Start

```bash
blockchain-buddies list
blockchain-buddies install boba
blockchain-buddies codex sync boba
blockchain-buddies metaplex metadata boba --out boba-agent.json
```

## Commands

| Command | What it does |
| --- | --- |
| `blockchain-buddies list` | Lists approved buddies from the live gallery manifest. |
| `blockchain-buddies install <slug>` | Installs a buddy into `~/.openclawd/buddies/<slug>/`. |
| `blockchain-buddies submit <path>` | Submits a buddy folder, zip, or parent directory. |
| `blockchain-buddies login` | Starts Clerk OAuth + PKCE for submissions. |
| `blockchain-buddies whoami` | Prints the signed-in user. |
| `blockchain-buddies logout` | Clears local credentials. |
| `blockchain-buddies codex install <slug>` | Installs a buddy and syncs it into OpenAI Codex-compatible pets. |
| `blockchain-buddies codex sync [slug]` | Copies one installed buddy, or all installed buddies, into `~/.codex/pets`. |
| `blockchain-buddies metaplex metadata <slug\|path> [--out file]` | Generates Metaplex Agent Registry metadata. |
| `blockchain-buddies petdex <command>` | Runs Petdex-compatible commands through the new package. |

## OpenClawd Buddy Layout

Install writes:

```text
~/.openclawd/buddies/<slug>/
  pet.json
  spritesheet.webp or spritesheet.png
  openclawd-buddy.json
```

`openclawd-buddy.json` records where the buddy came from and gives OpenClawd tools a stable discovery target.

Override the install directory:

```bash
OPENCLAWD_BUDDIES_DIR=/path/to/buddies blockchain-buddies install boba
```

## Metaplex Integration

Generate metadata for the Metaplex Agent Registry or other Solana identity workflows:

```bash
blockchain-buddies metaplex metadata boba --out boba-agent.json
```

The command is offline and safe: it reads a local buddy package and writes JSON. It does not mint assets, sign transactions, or use wallet secrets.

The generated metadata includes:

- OpenClawd platform identity
- Blockchain Buddies collection metadata
- Metaplex Agent Registry integration marker
- EIP-8004-compatible agent metadata marker
- Codex and Petdex compatibility attributes
- buddy asset file references

Use `METAPLEX_AGENT_NETWORK` to label the intended network:

```bash
METAPLEX_AGENT_NETWORK=solana-devnet blockchain-buddies metaplex metadata boba
```

## OpenAI Codex Integration

Blockchain Buddies keeps the same `pet.json` and `spritesheet.*` asset shape expected by Codex-style pet tooling.

Install and sync one buddy:

```bash
blockchain-buddies codex install boba
```

Sync an already installed buddy:

```bash
blockchain-buddies codex sync boba
```

Sync every installed buddy:

```bash
blockchain-buddies codex sync
```

The Codex target defaults to `~/.codex/pets`. Override it with:

```bash
CODEX_PETS_DIR=/path/to/codex/pets blockchain-buddies codex sync
```

## Petdex CLI Compatibility

This package keeps Petdex compatibility in two ways:

- The `petdex` binary still exists and points at this CLI.
- The `blockchain-buddies petdex <command>` namespace routes to compatible commands.

Examples:

```bash
petdex list
blockchain-buddies petdex install boba
PETDEX_URL=https://petdex.example.com blockchain-buddies petdex list
```

The compatibility layer intentionally keeps `pet.json` naming because that is the shared package format.

## Submit

A buddy folder or zip must contain:

```text
pet.json
spritesheet.webp
```

or:

```text
pet.json
spritesheet.png
```

Examples:

```bash
blockchain-buddies login
blockchain-buddies submit ~/.openclawd/buddies/boba
blockchain-buddies submit ~/Downloads/boba.zip
blockchain-buddies submit ~/.openclawd/buddies
```

## Environment

The CLI defaults to `https://buddies.solanaclawd.com`.

| Variable | Purpose |
| --- | --- |
| `BLOCKCHAIN_BUDDIES_URL` | Override the OpenClawd Blockchain Buddies API base URL. |
| `BUDDIES_URL` | Short alias for the API base URL. |
| `PETDEX_URL` | Legacy alias for Petdex-compatible APIs. |
| `OPENCLAWD_BUDDIES_DIR` | Override the OpenClawd install directory. |
| `BLOCKCHAIN_BUDDIES_DIR` | Compatible alias for the OpenClawd install directory. |
| `CODEX_PETS_DIR` | Override the OpenAI Codex-compatible pet directory. |
| `METAPLEX_AGENT_NETWORK` | Labels generated Metaplex metadata, default `solana-mainnet`. |
| `BLOCKCHAIN_BUDDIES_CLERK_ISSUER` | Clerk OAuth issuer for CLI login. |
| `BLOCKCHAIN_BUDDIES_CLERK_CLIENT_ID` | Clerk public OAuth client ID for CLI login. |
| `CLERK_CLI_ISSUER` | Compatible alias for the Clerk issuer. |
| `CLERK_OAUTH_CLIENT_ID` | Compatible alias for the Clerk OAuth client ID. |

Auth tokens are stored in the OS keychain under `blockchain-buddies-cli`, with a file fallback at `~/.config/openclawd/blockchain-buddies/openclawd.json`.
