import { createHash } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { serverEnv } from "@/lib/server/env";

type StoredDocument = {
  storageRef: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __workforceMemoryStorage: Map<string, Buffer> | undefined;
}

const getMemoryStorage = () => {
  if (!global.__workforceMemoryStorage) {
    global.__workforceMemoryStorage = new Map<string, Buffer>();
  }

  return global.__workforceMemoryStorage;
};

const getS3Client = () =>
  new S3Client({
    region: serverEnv.workforceStorageRegion,
    endpoint: serverEnv.workforceStorageEndpoint || undefined,
    forcePathStyle: serverEnv.workforceStorageForcePathStyle,
    credentials:
      serverEnv.workforceStorageAccessKeyId && serverEnv.workforceStorageSecretAccessKey
        ? {
            accessKeyId: serverEnv.workforceStorageAccessKeyId,
            secretAccessKey: serverEnv.workforceStorageSecretAccessKey
          }
        : undefined
  });

export const storeWorkforceDocument = async (params: {
  keyPrefix: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<StoredDocument> => {
  const sha256 = createHash("sha256").update(params.bytes).digest("hex");
  const objectKey = `${params.keyPrefix}/${crypto.randomUUID()}-${params.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-")}`;

  if (serverEnv.workforceStorageMode === "memory") {
    getMemoryStorage().set(objectKey, params.bytes);
    return {
      storageRef: `memory://${objectKey}`,
      sha256,
      sizeBytes: params.bytes.byteLength,
      mimeType: params.mimeType
    };
  }

  if (serverEnv.workforceStorageMode !== "s3") {
    throw new Error("Workforce document storage is not configured");
  }

  if (!serverEnv.workforceStorageBucket) {
    throw new Error("WORKFORCE_STORAGE_BUCKET is required when workforce storage mode is s3");
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: serverEnv.workforceStorageBucket,
      Key: objectKey,
      Body: params.bytes,
      ContentType: params.mimeType
    })
  );

  return {
    storageRef: `s3://${serverEnv.workforceStorageBucket}/${objectKey}`,
    sha256,
    sizeBytes: params.bytes.byteLength,
    mimeType: params.mimeType
  };
};
