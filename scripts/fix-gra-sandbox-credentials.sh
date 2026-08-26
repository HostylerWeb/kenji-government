#!/usr/bin/env bash
# Re-encrypt op-001 sandbox HMAC for gra-ingest when JWT_SECRET changed since seed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SANDBOX_HMAC="${GRA_HMAC_SECRET:-sandbox_hmac_op001_secret_32chars_min}"

node <<NODE
require("dotenv").config();
const { encryptIngestSecret, decryptIngestSecret } = require("./packages/shared/dist/crypto.js");
const { PrismaClient } = require("@prisma/client");

const secret = process.env.SANDBOX_HMAC || "${SANDBOX_HMAC}";
const prisma = new PrismaClient();

(async () => {
  const cred = await prisma.api_credentials.findFirst({
    where: { api_key_prefix: "gra_sandbox_" },
  });
  if (!cred) {
    console.error("No sandbox api_credentials row (prefix gra_sandbox_) — run db seed first.");
    process.exit(1);
  }

  try {
    const dec = decryptIngestSecret(cred.hmac_secret_encrypted);
    if (dec === secret) {
      console.log("op-001 sandbox HMAC already decrypts OK — no change needed.");
      await prisma.\$disconnect();
      return;
    }
    console.log("Decrypt OK but secret mismatch — re-encrypting.");
  } catch {
    console.log("Decrypt failed — re-encrypting with current JWT_SECRET / INGEST_ENCRYPTION_KEY.");
  }

  await prisma.api_credentials.update({
    where: { id: cred.id },
    data: { hmac_secret_encrypted: encryptIngestSecret(secret) },
  });
  console.log("op-001 sandbox HMAC re-encrypted.");
  await prisma.\$disconnect();
})();
NODE
