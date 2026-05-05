import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET ?? "petdex-pets";
const PUBLIC_BASE =
  process.env.R2_PUBLIC_BASE ??
  "https://pub-94495283df974cfea5e98d6a9e3fa462.r2.dev";

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[r2] missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY — uploads will fail",
  );
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID ?? "missing"}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID ?? "",
    secretAccessKey: SECRET_ACCESS_KEY ?? "",
  },
});

export const R2_BUCKET = BUCKET;
export const R2_PUBLIC_BASE = PUBLIC_BASE;

export type PresignedPut = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

/** Sign a PUT URL the browser can use to upload a file directly to R2. */
export async function presignPut(
  key: string,
  contentType: string,
  ttlSeconds = 60,
): Promise<PresignedPut> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2, command, {
    expiresIn: ttlSeconds,
    // Browser sends Content-Type, signature must match — let SDK include it.
    signableHeaders: new Set(["content-type"]),
  });
  return {
    uploadUrl,
    publicUrl: `${PUBLIC_BASE}/${key}`,
    key,
  };
}
