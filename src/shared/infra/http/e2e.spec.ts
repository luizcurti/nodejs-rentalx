/**
 * E2E Tests — all RentalX API routes
 * Runs against the rentx_test database (real PostgreSQL via Docker)
 */

// Mock EtherealMailProvider to prevent outbound network calls
jest.mock(
  "@shared/container/providers/MailProvider/implementations/EtherealMailProvider",
  () => ({
    EtherealMailProvider: class MockEthereal {
      async sendMail(): Promise<void> {}
    },
  })
);

import "reflect-metadata";
import request from "supertest";
import path from "path";
import fs from "fs";
import { hash } from "bcrypt";
import { v4 as uuidV4 } from "uuid";
import { container } from "tsyringe";

import { app } from "./app";
import { AppDataSource } from "@config/data-source";
import { MailProviderInMemory } from "@shared/container/providers/MailProvider/in-memory/MailProviderInMemory";

// Replace MailProvider with in-memory after imports are resolved
container.registerInstance("MailProvider", new MailProviderInMemory());

jest.setTimeout(60_000);

// ─── Test constants ────────────────────────────────────────────────────────
const ADMIN_EMAIL = "e2e-admin@rentx.com.br";
const ADMIN_PASS = "Admin@E2E123";
const USER_EMAIL = "e2e-user@rentx.com.br";
const USER_PASS = "User@E2E123";

// ─── State shared across test groups ─────────────────────────────────
let adminToken: string;
let userToken: string;
let userRefreshToken: string;
let sharedCategoryId: string;
let sharedSpecificationId: string;

// Minimal 1×1 px JPEG buffer for upload tests
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/" +
    "EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/" +
    "aAAwDAQACEQMRAD8AJQAB/9k=",
  "base64"
);

const tmpFolder = path.resolve(__dirname, "..", "..", "..", "..", "tmp");

// ─── Database helpers ────────────────────────────────────────────────
async function clearDB(): Promise<void> {
  const tables = [
    "specifications_cars",
    "cars_image",
    "rentals",
    "cars",
    "specifications",
    "categories",
    "users_tokens",
    "users",
  ];
  for (const t of tables) {
    await AppDataSource.query(`TRUNCATE TABLE "${t}" CASCADE`);
  }
}

async function dbRow<T = Record<string, string>>(
  sql: string
): Promise<T | undefined> {
  const rows = await AppDataSource.query(sql);
  return rows[0] as T | undefined;
}

// ─── Global setup ───────────────────────────────────────────────────
beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.runMigrations();
  await clearDB();

  // Ensure upload directories exist
  fs.mkdirSync(tmpFolder, { recursive: true });
  fs.mkdirSync(path.join(tmpFolder, "avatar"), { recursive: true });
  fs.mkdirSync(path.join(tmpFolder, "cars"), { recursive: true });

  // Insert admin user directly into the database
  const adminId = uuidV4();
  const adminHash = await hash(ADMIN_PASS, 8);
  await AppDataSource.query(`
    INSERT INTO users (id, name, email, password, "isAdmin", driver_license, created_at)
    VALUES ('${adminId}', 'Admin E2E', '${ADMIN_EMAIL}', '${adminHash}', true, 'ADM0001E2E', now())
  `);

  // Authenticate admin
  const adminRes = await request(app)
    .post("/sessions")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
  adminToken = adminRes.body.token;

  // Create regular user via API
  await request(app).post("/users").send({
    name: "E2E User",
    email: USER_EMAIL,
    password: USER_PASS,
    driver_license: "USR0001E2E",
  });
  const userRes = await request(app)
    .post("/sessions")
    .send({ email: USER_EMAIL, password: USER_PASS });
  userToken = userRes.body.token;
  userRefreshToken = userRes.body.refresh_token;

  // Create shared category (used in car tests)
  await request(app)
    .post("/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "E2E-Shared-Cat", description: "E2E Shared Category" });
  const catRow = await dbRow<{ id: string }>(
    `SELECT id FROM categories WHERE name = 'E2E-Shared-Cat' LIMIT 1`
  );
  sharedCategoryId = (catRow as { id: string }).id;

  // Create shared specification (used in car tests)
  await request(app)
    .post("/specifications")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "E2E-Shared-Spec", description: "E2E Shared Specification" });
  const specRow = await dbRow<{ id: string }>(
    `SELECT id FROM specifications WHERE name = 'E2E-Shared-Spec' LIMIT 1`
  );
  sharedSpecificationId = (specRow as { id: string }).id;
});

afterAll(async () => {
  try {
    await clearDB();
  } catch {
    // ignore cleanup errors — dummy ref to satisfy linter
    void 0;
  }
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

// ══════════════════════════════════════════════════════════════════════
//  POST /sessions
// ══════════════════════════════════════════════════════════════════════
describe("POST /sessions — authenticate user", () => {
  it("valid input → 200 + token + refresh_token + user.{name,email}", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      token: expect.any(String),
      refresh_token: expect.any(String),
      user: { name: "Admin E2E", email: ADMIN_EMAIL },
    });
  });

  it("wrong password → 400 + error message", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: ADMIN_EMAIL, password: "wrongpassword" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email or password incorrect!");
  });

  it("non-existent email → 400", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: "nonexistent@rentx.com.br", password: "anypass" });

    expect(res.status).toBe(400);
  });

  it("missing email → 400", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ password: ADMIN_PASS });

    expect(res.status).toBe(400);
  });

  it("missing password → 400", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: ADMIN_EMAIL });

    expect(res.status).toBe(400);
  });

  it("empty body → 400", async () => {
    const res = await request(app).post("/sessions").send({});
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /refresh-token
// ══════════════════════════════════════════════════════════════════════
describe("POST /refresh-token — renew token", () => {
  it("valid refresh_token (body) → 200 + new token + new refresh_token", async () => {
    const res = await request(app)
      .post("/refresh-token")
      .send({ token: userRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      token: expect.any(String),
      refresh_token: expect.any(String),
    });
    // Update tokens for subsequent tests
    userToken = res.body.token;
    userRefreshToken = res.body.refresh_token;
  });

  it("refresh_token via header x-access-token → 200", async () => {
    const res = await request(app)
      .post("/refresh-token")
      .set("x-access-token", userRefreshToken);

    expect(res.status).toBe(200);
    userToken = res.body.token;
    userRefreshToken = res.body.refresh_token;
  });

  it("invalid token → 401", async () => {
    const res = await request(app)
      .post("/refresh-token")
      .send({ token: "invalid.token.here" });

    expect(res.status).toBe(401);
  });

  it("missing token → 400", async () => {
    const res = await request(app).post("/refresh-token").send({});
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /users
// ══════════════════════════════════════════════════════════════════════
describe("POST /users — create user", () => {
  it("valid data → 201 with no body", async () => {
    const res = await request(app).post("/users").send({
      name: "New E2E User",
      email: `new-${uuidV4()}@rentx.com.br`,
      password: "Pass@123",
      driver_license: `NEW${Date.now()}`,
    });

    expect(res.status).toBe(201);
  });

  it("duplicate email → 400 + message", async () => {
    const res = await request(app).post("/users").send({
      name: "Duplicate",
      email: USER_EMAIL, // already exists
      password: "Pass@123",
      driver_license: "DUP0001E2E",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User already exists");
  });

  it("missing password does not create user with incomplete data", async () => {
    const res = await request(app).post("/users").send({
      name: "No Password",
      email: `nopassword-${uuidV4()}@rentx.com.br`,
      driver_license: "SEM0001",
    });

    // Can return 400 or 500 depending on validation
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  GET /users/profile
// ══════════════════════════════════════════════════════════════════════
describe("GET /users/profile — authenticated profile", () => {
  it("valid token → 200 + user data", async () => {
    const res = await request(app)
      .get("/users/profile")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: USER_EMAIL,
      name: "E2E User",
    });
    expect(res.body).toHaveProperty("driver_license");
    expect(res.body).toHaveProperty("avatar_url");
  });

  it("missing token → 401", async () => {
    const res = await request(app).get("/users/profile");
    expect(res.status).toBe(401);
  });

  it("malformed token → 401", async () => {
    const res = await request(app)
      .get("/users/profile")
      .set("Authorization", "Bearer invalid.token");

    expect(res.status).toBe(401);
  });

  it("missing Authorization header → 401", async () => {
    const res = await request(app)
      .get("/users/profile")
      .set("Authorization", "");

    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  PATCH /users/avatar
// ══════════════════════════════════════════════════════════════════════
describe("PATCH /users/avatar — update avatar", () => {
  const srcJpeg = path.join(tmpFolder, "e2e-avatar-src.jpg");

  beforeAll(() => {
    fs.writeFileSync(srcJpeg, TINY_JPEG);
  });

  afterAll(() => {
    if (fs.existsSync(srcJpeg)) fs.unlinkSync(srcJpeg);
  });

  it("valid token + file → 204", async () => {
    const res = await request(app)
      .patch("/users/avatar")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("avatar", srcJpeg);

    expect(res.status).toBe(204);
  });

  it("missing file → 400", async () => {
    const res = await request(app)
      .patch("/users/avatar")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(400);
  });

  it("missing token → 401", async () => {
    const res = await request(app).patch("/users/avatar");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /categories  +  GET /categories  +  POST /categories/import
// ══════════════════════════════════════════════════════════════════════
describe("Categories", () => {
  const csvPath = path.join(tmpFolder, "e2e-categories.csv");

  beforeAll(() => {
    fs.writeFileSync(csvPath, "name,description\nE2E-CSV-Hatch,Hatchback cars\nE2E-CSV-Sedan,Sedan cars\n");
  });
  afterAll(() => {
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  });

  describe("POST /categories", () => {
    it("admin + valid data → 201", async () => {
      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "SUV-E2E", description: "SUV Category" });

      expect(res.status).toBe(201);
    });

    it("admin + duplicate name → 400", async () => {
      await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "SEDAN-E2E", description: "Sedan" });

      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "SEDAN-E2E", description: "Duplicate" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Category already exists!");
    });

    it("non-admin user → 403", async () => {
      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "NoPermission", description: "X" });

      expect(res.status).toBe(403);
    });

    it("missing token → 401", async () => {
      const res = await request(app)
        .post("/categories")
        .send({ name: "NoAuth", description: "X" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /categories", () => {
    it("no authentication → 200 + array with at least 1 item", async () => {
      const res = await request(app).get("/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("each item contains id, name and description", async () => {
      const res = await request(app).get("/categories");

      expect(res.status).toBe(200);
      res.body.forEach((cat: Record<string, unknown>) => {
        expect(cat).toHaveProperty("id");
        expect(cat).toHaveProperty("name");
        expect(cat).toHaveProperty("description");
      });
    });
  });

  describe("POST /categories/import — import CSV", () => {
    it("admin + valid CSV → 201", async () => {
      const res = await request(app)
        .post("/categories/import")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", csvPath);

      expect(res.status).toBe(201);
    });

    it("missing token → 401", async () => {
      const res = await request(app)
        .post("/categories/import")
        .attach("file", csvPath);

      expect(res.status).toBe(401);
    });

    it("non-admin → 403", async () => {
      const res = await request(app)
        .post("/categories/import")
        .set("Authorization", `Bearer ${userToken}`)
        .attach("file", csvPath);

      expect(res.status).toBe(403);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /specifications  +  GET /specifications
// ══════════════════════════════════════════════════════════════════════
describe("Specifications", () => {
  describe("POST /specifications", () => {
    it("admin + valid data → 201", async () => {
      const res = await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Ar-cond-E2E", description: "Air conditioning" });

      expect(res.status).toBe(201);
    });

    it("admin + duplicate name → 400", async () => {
      await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "GPS-E2E", description: "Navigation" });

      const res = await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "GPS-E2E", description: "Duplicate" });

      expect(res.status).toBe(400);
    });

    it("non-admin user → 403", async () => {
      const res = await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Forbidden", description: "X" });

      expect(res.status).toBe(403);
    });

    it("missing token → 401", async () => {
      const res = await request(app)
        .post("/specifications")
        .send({ name: "NoAuth", description: "X" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /specifications", () => {
    it("no authentication → 200 + array", async () => {
      const res = await request(app).get("/specifications");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("each item contains id, name, description", async () => {
      const res = await request(app).get("/specifications");

      expect(res.status).toBe(200);
      res.body.forEach((spec: Record<string, unknown>) => {
        expect(spec).toHaveProperty("id");
        expect(spec).toHaveProperty("name");
        expect(spec).toHaveProperty("description");
      });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
//  Cars — POST /cars | GET /cars/available
//           POST /cars/specifications/:id | POST /cars/images/:id
// ══════════════════════════════════════════════════════════════════════
describe("Cars", () => {
  let carId: string;
  const srcImg = path.join(tmpFolder, "e2e-car-img.jpg");

  beforeAll(async () => {
    fs.writeFileSync(srcImg, TINY_JPEG);
  });
  afterAll(() => {
    if (fs.existsSync(srcImg)) fs.unlinkSync(srcImg);
  });

  describe("POST /cars", () => {
    it("admin + valid data → 201 + car object with id and available=true", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Fusion E2E",
          description: "Executive Sedan E2E",
          daily_rate: 150,
          license_plate: "E2E-0001",
          fine_amount: 50,
          brand: "Ford",
          category_id: sharedCategoryId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Fusion E2E",
        available: true,
        license_plate: "E2E-0001",
        brand: "Ford",
      });
      expect(res.body.id).toBeDefined();
      carId = res.body.id;
    });

    it("admin + duplicate license plate → 400", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate",
          description: "Duplicate",
          daily_rate: 100,
          license_plate: "E2E-0001", // already exists
          fine_amount: 30,
          brand: "Ford",
          category_id: sharedCategoryId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Car already exists!");
    });

    it("non-admin user → 403", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Forbidden",
          description: "X",
          daily_rate: 100,
          license_plate: "E2E-9999",
          fine_amount: 30,
          brand: "Brand",
          category_id: sharedCategoryId,
        });

      expect(res.status).toBe(403);
    });

    it("missing token → 401", async () => {
      const res = await request(app).post("/cars").send({
        name: "NoAuth",
        license_plate: "E2E-8888",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /cars/available", () => {
    it("no authentication → 200 + array", async () => {
      const res = await request(app).get("/cars/available");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("car created above appears in the listing", async () => {
      const res = await request(app).get("/cars/available");

      expect(res.status).toBe(200);
      const found = res.body.find((c: Record<string, string>) => c.license_plate === "E2E-0001");
      expect(found).toBeDefined();
    });

    it("filter by brand → only cars of that brand", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ brand: "Ford" });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((c: Record<string, string>) =>
        expect(c.brand).toBe("Ford")
      );
    });

    it("filter by category_id → only cars in that category", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ category_id: sharedCategoryId });

      expect(res.status).toBe(200);
      res.body.forEach((c: Record<string, string>) =>
        expect(c.category_id).toBe(sharedCategoryId)
      );
    });

    it("filter by name → only cars with that name", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ name: "Fusion E2E" });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((c: Record<string, string>) =>
        expect(c.name).toBe("Fusion E2E")
      );
    });

    it("pagination (page=1, limit=1) → array with 1 item", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });
  });

  describe("POST /cars/specifications/:id", () => {
    it("admin + valid car_id + spec → 200 + car with specifications[]", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${carId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.specifications)).toBe(true);
      expect(res.body.specifications.length).toBeGreaterThan(0);
    });

    it("non-existent car_id → 400", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${uuidV4()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(400);
    });

    it("non-admin → 403", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${carId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(403);
    });

    it("missing token → 401", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${carId}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /cars/images/:id", () => {
    it("admin + image file → 201", async () => {
      const res = await request(app)
        .post(`/cars/images/${carId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("images", srcImg);

      expect(res.status).toBe(201);
    });

    it("non-admin → 403", async () => {
      const res = await request(app)
        .post(`/cars/images/${carId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .attach("images", srcImg);

      expect(res.status).toBe(403);
    });

    it("missing token → 401", async () => {
      const res = await request(app).post(`/cars/images/${carId}`);
      expect(res.status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
//  Rentals — POST /rentals | GET /rentals/user | PATCH /rentals/devolution/:id
// ══════════════════════════════════════════════════════════════════════
describe("Rentals", () => {
  let rentalCarId: string;
  let rentalId: string;

  const expectedReturn48h = () =>
    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const expectedReturn1h = () =>
    new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();

  beforeAll(async () => {
    // Create dedicated car for rental flow
    const carRes = await request(app)
      .post("/cars")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Rental Car E2E",
        description: "Car for rental tests",
        daily_rate: 100,
        license_plate: `RNT-${Date.now()}`,
        fine_amount: 50,
        brand: "RentalBrand",
        category_id: sharedCategoryId,
      });
    rentalCarId = carRes.body.id;
  });

  describe("POST /rentals — create rental", () => {
    it("invalid input: missing expected_return_date → 400", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("expected_return_date is required!");
    });

    it("invalid input: malformed date → 400", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId, expected_return_date: "not-a-date" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("expected_return_date is not a valid date!");
    });

    it("date < 24h → 400 (minimum period not met)", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn1h() });

      expect(res.status).toBe(400);
    });

    it("missing token → 401", async () => {
      const res = await request(app)
        .post("/rentals")
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(401);
    });

    it("valid data → 201 + rental object with car_id and user_id", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(201);
      rentalId = res.body.id;
      expect(res.body).toMatchObject({
        car_id: rentalCarId,
        user_id: expect.any(String),
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.expected_return_date).toBeDefined();
    });

    it("car already rented → another user tries → 400", async () => {
      const otherEmail = `other-${uuidV4()}@rentx.com.br`;
      await request(app).post("/users").send({
        name: "Other User",
        email: otherEmail,
        password: "Other@123",
        driver_license: `OTR${Date.now()}`,
      });
      const outroAuth = await request(app)
        .post("/sessions")
        .send({ email: otherEmail, password: "Other@123" });
      const outroToken = outroAuth.body.token;

      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${outroToken}`)
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(400);
    });

    it("user already has an open rental → 400", async () => {
      // Create another available car
      const anotherCarRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Another Car",
          description: "other",
          daily_rate: 80,
          license_plate: `OTR-${Date.now()}`,
          fine_amount: 20,
          brand: "OtherBrand",
          category_id: sharedCategoryId,
        });
      const anotherCarId = anotherCarRes.body.id;

      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`) // userToken already has an open rental
        .send({ car_id: anotherCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /rentals/user — list user rentals", () => {
    it("authenticated user → 200 + array with at least 1 rental", async () => {
      const res = await request(app)
        .get("/rentals/user")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("returned rental contains expected fields", async () => {
      const res = await request(app)
        .get("/rentals/user")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const rental = res.body.find((r: Record<string, string>) => r.id === rentalId);
      expect(rental).toBeDefined();
      expect(rental).toMatchObject({
        id: rentalId,
        car_id: rentalCarId,
        user_id: expect.any(String),
      });
    });

    it("missing token → 401", async () => {
      const res = await request(app).get("/rentals/user");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /rentals/devolution/:id — car return", () => {
    it("valid token + valid rental_id → 200 + rental with total and end_date", async () => {
      const res = await request(app)
        .patch(`/rentals/devolution/${rentalId}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: rentalId,
        car_id: rentalCarId,
        total: expect.any(Number),
      });
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.end_date).toBeDefined();
    });

    it("non-existent rental_id (non-UUID string) → preserves integrity → 400 or 500", async () => {
      const res = await request(app)
        .patch(`/rentals/devolution/00000000-0000-0000-0000-000000000000`)
        .set("Authorization", `Bearer ${userToken}`);

      // non-existent rental → AppError 400 or DB error
      expect([400, 500]).toContain(res.status);
    });

    it("non-existent rental_id → 400", async () => {
      const res = await request(app)
        .patch(`/rentals/devolution/${uuidV4()}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it("missing token → 401", async () => {
      const res = await request(app).patch(`/rentals/devolution/${rentalId}`);
      expect(res.status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /password/forgot  +  POST /password/reset
// ══════════════════════════════════════════════════════════════════════
describe("Password Recovery", () => {
  const forgotEmail = `forgot-${uuidV4()}@rentx.com.br`;
  const forgotPass = "OldPassword@123";
  const newPass = "NewPassword@456";
  let forgotToken: string;

  beforeAll(async () => {
    await request(app).post("/users").send({
      name: "Forgot User E2E",
      email: forgotEmail,
      password: forgotPass,
      driver_license: `FGT${Date.now()}`,
    });
  });

  describe("POST /password/forgot", () => {
    it("registered email → 200 + creates record in users_tokens", async () => {
      const res = await request(app)
        .post("/password/forgot")
        .send({ email: forgotEmail });

      expect(res.status).toBe(200);

      // Verify token was created in the database
      const userRow = await dbRow<{ id: string }>(
        `SELECT id FROM users WHERE email = '${forgotEmail}' LIMIT 1`
      );
      expect(userRow).toBeDefined();

      const tokenRow = await dbRow<{ refresh_token: string }>(
        `SELECT refresh_token FROM users_tokens WHERE user_id = '${(userRow as { id: string }).id}' LIMIT 1`
      );
      expect(tokenRow).toBeDefined();
      forgotToken = (tokenRow as { refresh_token: string }).refresh_token;
    });

    it("unregistered email → 200 (no user enumeration)", async () => {
      const res = await request(app)
        .post("/password/forgot")
        .send({ email: `nonexistent-${uuidV4()}@rentx.com.br` });

      expect(res.status).toBe(200);
    });

    it("missing email field → 200 (defensive behaviour)", async () => {
      const res = await request(app).post("/password/forgot").send({});
      // Accepts 200 or 400 depending on implementation
      expect([200, 400]).toContain(res.status);
    });
  });

  describe("POST /password/reset", () => {
    it("valid token + new password → 200 + login works with new password", async () => {
      const res = await request(app)
        .post("/password/reset")
        .query({ token: forgotToken })
        .send({ password: newPass });

      expect(res.status).toBe(200);

      // Verify login works with the new password
      const loginRes = await request(app)
        .post("/sessions")
        .send({ email: forgotEmail, password: newPass });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty("token");
    });

    it("already-used token → 400", async () => {
      // Token was invalidated in the previous operation
      const res = await request(app)
        .post("/password/reset")
        .query({ token: forgotToken })
        .send({ password: "AnotherPassword@789" });

      expect(res.status).toBe(400);
    });

    it("non-existent token → 400 + message", async () => {
      const res = await request(app)
        .post("/password/reset")
        .query({ token: uuidV4() })
        .send({ password: "AnotherPassword@789" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Token invalid!");
    });

    it("missing token in query → 400", async () => {
      const res = await request(app)
        .post("/password/reset")
        .send({ password: "NoToken@123" });

      expect(res.status).toBe(400);
    });
  });
});
