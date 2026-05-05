import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import { db, schema } from "@/lib/db/client";
import { getMintErrorMessage, mintBlockchainBuddy } from "@/lib/metaplex-agent";
import { requireSameOrigin } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MintBody = {
  name?: unknown;
  description?: unknown;
  metadataUri?: unknown;
  imageUrl?: unknown;
  personality?: unknown;
  species?: unknown;
  ownerWallet?: unknown;
};

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: MintBody;
  try {
    body = (await req.json()) as MintBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = cleanString(body.name, 80);
  const description = cleanString(body.description, 600);
  const metadataUri = cleanString(body.metadataUri, 500);
  const imageUrl = cleanString(body.imageUrl, 500);
  const personality = cleanString(body.personality, 160);
  const species = cleanString(body.species, 80);
  const ownerWallet = cleanString(body.ownerWallet, 80);

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "invalid_name", message: "Name must be at least 2 characters." },
      { status: 400 },
    );
  }
  if (!description || description.length < 12) {
    return NextResponse.json(
      {
        error: "invalid_description",
        message: "Description must be at least 12 characters.",
      },
      { status: 400 },
    );
  }
  if (!metadataUri || !isHttpUrl(metadataUri)) {
    return NextResponse.json(
      {
        error: "invalid_metadata_uri",
        message: "Metadata URI must be a publicly reachable http(s) JSON URL.",
      },
      { status: 400 },
    );
  }
  if (imageUrl && !isHttpUrl(imageUrl)) {
    return NextResponse.json(
      { error: "invalid_image_url", message: "Image URL must be http(s)." },
      { status: 400 },
    );
  }

  try {
    const mint = await mintBlockchainBuddy({
      name,
      description,
      metadataUri,
      imageUrl: imageUrl || undefined,
      personality: personality || undefined,
      species: species || undefined,
      ownerWallet: ownerWallet || undefined,
    });

    const id = crypto.randomUUID();
    await db.insert(schema.blockchainBuddies).values({
      id,
      ownerId: userId,
      ownerWallet: ownerWallet || null,
      name,
      description,
      imageUrl: imageUrl || null,
      metadataUri,
      personality: personality || null,
      species: species || null,
      assetAddress: mint.assetAddress,
      mintSignature: mint.signature,
      cluster: mint.network,
      rpcProvider: "helius",
    });

    return NextResponse.json(
      {
        ok: true,
        buddy: {
          id,
          name,
          assetAddress: mint.assetAddress,
          signature: mint.signature,
          network: mint.network,
          mintAuthority: mint.owner,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "mint_failed", message: getMintErrorMessage(error) },
      { status: 500 },
    );
  }
}
