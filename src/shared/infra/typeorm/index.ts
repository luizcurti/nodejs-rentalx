import { DataSource } from "typeorm";
import { AppDataSource } from "@config/data-source";

export { AppDataSource };

export default async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
};
