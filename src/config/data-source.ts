import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const ext = isProd ? 'js' : 'ts';
const root = isProd ? 'dist' : 'src';

const dbUsername = isProd
  ? process.env.DB_USERNAME
  : (process.env.DB_USERNAME ?? "docker");
const dbPassword = isProd
  ? process.env.DB_PASSWORD
  : (process.env.DB_PASSWORD ?? "ignite");

if (isProd && !dbUsername) {
  throw new Error("Missing required env variable: DB_USERNAME");
}
if (isProd && !dbPassword) {
  throw new Error("Missing required env variable: DB_PASSWORD");
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: dbUsername,
  password: dbPassword,
  database: process.env.NODE_ENV === "test"
    ? "rentx_test"
    : (process.env.DB_DATABASE || "rentx"),
  synchronize: false,
  logging: false,
  entities: [`./${root}/modules/**/entities/*.${ext}`],
  migrations: [`./${root}/shared/infra/typeorm/migrations/*.${ext}`],
});