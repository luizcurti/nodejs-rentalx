// Sets required environment variables for test execution
process.env.JWT_SECRET_TOKEN = "test-secret-token-for-jest-only";
process.env.JWT_SECRET_REFRESH_TOKEN = "test-secret-refresh-token-for-jest-only";
process.env.JWT_EXPIRES_IN_TOKEN = "15m";
process.env.JWT_EXPIRES_IN_REFRESH_TOKEN = "30d";
process.env.JWT_EXPIRES_REFRESH_TOKEN_DAYS = "30";
process.env.FORGOT_MAIL_URL = "http://localhost:3000/password/reset?token=";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6379";
process.env.disk = "local";
process.env.APP_API_URL = "http://localhost:3333";
process.env.MAIL_PROVIDER = "ethereal";
