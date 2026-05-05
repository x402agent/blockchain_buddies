# Blockchain Buddies CLI

Install, browse, and submit Blockchain Buddies for OpenClawd from your terminal.

- Gallery: <https://buddies.openclawd.biz>
- Repo: <https://github.com/clawdsolana/OpenClawd/tree/main/blockchain_buddies>
- Default install directory: `~/.openclawd/buddies`

## Quick Start

```bash
npx @openclawdsolana/blockchain-buddies --help
npx @openclawdsolana/blockchain-buddies list
npx @openclawdsolana/blockchain-buddies install boba
```

The package exposes three binaries:

- `blockchain-buddies` - primary command
- `buddies` - short alias
- `petdex` - legacy compatibility alias

## Commands

| Command | What it does |
| --- | --- |
| `blockchain-buddies list` | Lists approved buddies from the live gallery manifest. |
| `blockchain-buddies install <slug>` | Installs a buddy into `~/.openclawd/buddies/<slug>/`. |
| `blockchain-buddies login` | Starts Clerk OAuth + PKCE in the browser. |
| `blockchain-buddies whoami` | Prints the current signed-in user. |
| `blockchain-buddies logout` | Clears local credentials. |
| `blockchain-buddies submit <path>` | Submits a buddy folder, zip, or parent directory. |

## OpenClawd Integration

Install writes:

```text
~/.openclawd/buddies/<slug>/
  pet.json
  spritesheet.webp or spritesheet.png
  openclawd-buddy.json
```

`pet.json` and `spritesheet.*` stay Codex-pet-format compatible so existing asset tooling continues to work. `openclawd-buddy.json` identifies the install as a Blockchain Buddies package and gives OpenClawd a stable discovery target.

Override the install directory with:

```bash
OPENCLAWD_BUDDIES_DIR=/path/to/buddies blockchain-buddies install boba
```

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

The CLI defaults to `https://buddies.openclawd.biz`.

| Variable | Purpose |
| --- | --- |
| `BLOCKCHAIN_BUDDIES_URL` | Override the gallery/API base URL. |
| `BUDDIES_URL` | Short alias for the gallery/API base URL. |
| `PETDEX_URL` | Legacy alias for the gallery/API base URL. |
| `OPENCLAWD_BUDDIES_DIR` | Override the local install directory. |
| `BLOCKCHAIN_BUDDIES_CLERK_ISSUER` | Clerk OAuth issuer for CLI login. |
| `BLOCKCHAIN_BUDDIES_CLERK_CLIENT_ID` | Clerk public OAuth client ID for CLI login. |
| `CLERK_CLI_ISSUER` | Compatible alias for the Clerk issuer. |
| `CLERK_OAUTH_CLIENT_ID` | Compatible alias for the Clerk OAuth client ID. |

Auth tokens are stored in the OS keychain under `blockchain-buddies-cli`, with a file fallback at `~/.config/openclawd/blockchain-buddies/openclawd.json`.
