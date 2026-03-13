if (!process.env.JWT_SECRET_TOKEN) {
  throw new Error("Missing required env variable: JWT_SECRET_TOKEN");
}
if (!process.env.JWT_SECRET_REFRESH_TOKEN) {
  throw new Error("Missing required env variable: JWT_SECRET_REFRESH_TOKEN");
}

export default {
  secret_token: process.env.JWT_SECRET_TOKEN,
  expires_in_token: process.env.JWT_EXPIRES_IN_TOKEN ?? "15m",
  secret_refresh_token: process.env.JWT_SECRET_REFRESH_TOKEN,
  expires_in_refresh_token: process.env.JWT_EXPIRES_IN_REFRESH_TOKEN ?? "30d",
  expires_refresh_token_days: Number(process.env.JWT_EXPIRES_REFRESH_TOKEN_DAYS ?? 30),
};
