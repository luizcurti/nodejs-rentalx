import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const ext = isProd ? 'js' : 'ts';
const root = isProd ? 'dist' : 'src';

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "docker",
  password: process.env.DB_PASSWORD || "ignite",
  database: process.env.DB_DATABASE || "rentx",
  synchronize: false,
  logging: false,
  entities: [`./${root}/modules/**/entities/*.${ext}`],
  migrations: [`./${root}/shared/infra/typeorm/migrations/*.${ext}`],
});