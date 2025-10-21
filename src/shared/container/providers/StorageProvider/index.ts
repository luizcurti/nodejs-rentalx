import { container } from "tsyringe";

import { LocalStorageProvider } from "./implementations/LocalStorageProvider";
import { S3StorageProvider } from "./implementations/S3StorageProvider";
import { IStorageProvider } from "./IStorageProvider";

type DiskTypes = "local" | "s3";

const diskStorage = {
  local: LocalStorageProvider,
  s3: S3StorageProvider,
};

const storageType = process.env.disk as DiskTypes | undefined;

if (!storageType || !diskStorage[storageType]) {
  throw new Error("Invalid storage provider configuration. Ensure 'process.env.disk' is set to 'local' or 's3'.");
}
container.registerSingleton<IStorageProvider>(
  "StorageProvider",
  diskStorage[storageType]
);
