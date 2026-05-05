import "server-only";

import {
  isAgentApiError,
  isAgentApiNetworkError,
  isAgentValidationError,
  mintAndSubmitAgent,
  mplAgentIdentity,
  type SvmNetwork,
} from "@metaplex-foundation/mpl-agent-registry";
import { keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import bs58 from "bs58";

type MintBuddyInput = {
  name: string;
  description: string;
  metadataUri: string;
  imageUrl?: string;
  personality?: string;
  species?: string;
  ownerWallet?: string;
};

export type MintBuddyResult = {
  assetAddress: string;
  signature: string;
  network: SvmNetwork;
  owner: string;
};

const DEFAULT_NETWORK: SvmNetwork = "solana-mainnet";

export function getHeliusRpcUrl() {
  const explicit =
    process.env.HELIUS_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL?.trim();
  if (explicit) return explicit;

  const key = process.env.HELIUS_API_KEY?.trim();
  if (key) return `https://mainnet.helius-rpc.com/?api-key=${key}`;

  return "https://api.mainnet-beta.solana.com";
}

function getNetwork(): SvmNetwork {
  const value = process.env.METAPLEX_AGENT_NETWORK?.trim();
  if (value === "solana-devnet") return value;
  if (value === "localnet") return value;
  return DEFAULT_NETWORK;
}

function parseSecretKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("BUDDIES_MINT_AUTHORITY_SECRET_KEY is empty");

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Mint authority secret key JSON must be an array");
    }
    return Uint8Array.from(parsed.map((n) => Number(n)));
  }

  return bs58.decode(trimmed);
}

function getMintAuthoritySecretKey() {
  const value =
    process.env.BUDDIES_MINT_AUTHORITY_SECRET_KEY?.trim() ||
    process.env.SOLANA_PRIVATE_KEY?.trim();
  if (!value) {
    throw new Error(
      "Missing BUDDIES_MINT_AUTHORITY_SECRET_KEY. Set a funded Solana keypair before minting Blockchain Buddies.",
    );
  }
  return parseSecretKey(value);
}

export async function mintBlockchainBuddy(
  input: MintBuddyInput,
): Promise<MintBuddyResult> {
  const rpcUrl = getHeliusRpcUrl();
  const network = getNetwork();
  const umi = createUmi(rpcUrl).use(mplAgentIdentity());
  const keypair = umi.eddsa.createKeypairFromSecretKey(
    getMintAuthoritySecretKey(),
  );
  umi.use(keypairIdentity(keypair));

  const services = [
    {
      name: "web",
      endpoint: "https://buddies.openclawd.biz/birth",
    },
    {
      name: "OpenClawd",
      endpoint: "https://openclawd.net",
    },
  ];

  const result = await mintAndSubmitAgent(
    umi,
    {},
    {
      wallet: umi.identity.publicKey,
      network,
      name: input.name,
      uri: input.metadataUri,
      agentMetadata: {
        type: "agent",
        name: input.name,
        description: input.description,
        services,
        registrations: [
          {
            agentId: "blockchain-buddies",
            agentRegistry: "solana:101:metaplex",
          },
        ],
        supportedTrust: ["reputation", "crypto-economic"],
      },
    },
  );

  return {
    assetAddress: result.assetAddress,
    signature: bs58.encode(result.signature),
    network,
    owner: umi.identity.publicKey.toString(),
  };
}

export function getMintErrorMessage(error: unknown) {
  if (isAgentValidationError(error)) {
    return `Metaplex validation failed for ${error.field}: ${error.message}`;
  }
  if (isAgentApiNetworkError(error)) {
    return `Could not reach the Metaplex Agent API: ${error.message}`;
  }
  if (isAgentApiError(error)) {
    return `Metaplex Agent API rejected the mint (${error.statusCode}): ${error.message}`;
  }
  return error instanceof Error ? error.message : "Mint failed";
}
