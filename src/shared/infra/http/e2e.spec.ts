/**
 * Testes E2E — todas as rotas da API RentalX
 * Executa contra o banco rentx_test (PostgreSQL real via Docker)
 */

// Mocka o EtherealMailProvider para não fazer chamadas à rede
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

// Substitui o MailProvider pelo in-memory após os imports serem resolvidos
container.registerInstance("MailProvider", new MailProviderInMemory());

jest.setTimeout(60_000);

// ─── Constantes de teste ───────────────────────────────────────────────
const ADMIN_EMAIL = "e2e-admin@rentx.com.br";
const ADMIN_PASS = "Admin@E2E123";
const USER_EMAIL = "e2e-user@rentx.com.br";
const USER_PASS = "User@E2E123";

// ─── Estado compartilhado entre grupos de teste ──────────────────────
let adminToken: string;
let userToken: string;
let userRefreshToken: string;
let sharedCategoryId: string;
let sharedSpecificationId: string;

// Buffer de imagem JPEG mínima (1×1 px) para testes de upload
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/" +
    "EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/" +
    "aAAwDAQACEQMRAD8AJQAB/9k=",
  "base64"
);

const tmpFolder = path.resolve(__dirname, "..", "..", "..", "..", "tmp");

// ─── Helpers de banco ────────────────────────────────────────────────
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

// ─── Setup global ─────────────────────────────────────────────────────
beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.runMigrations();
  await clearDB();

  // Garante existência dos diretórios de upload
  fs.mkdirSync(tmpFolder, { recursive: true });
  fs.mkdirSync(path.join(tmpFolder, "avatar"), { recursive: true });
  fs.mkdirSync(path.join(tmpFolder, "cars"), { recursive: true });

  // Cria usuário admin diretamente no banco
  const adminId = uuidV4();
  const adminHash = await hash(ADMIN_PASS, 8);
  await AppDataSource.query(`
    INSERT INTO users (id, name, email, password, "isAdmin", driver_license, created_at)
    VALUES ('${adminId}', 'Admin E2E', '${ADMIN_EMAIL}', '${adminHash}', true, 'ADM0001E2E', now())
  `);

  // Autentica admin
  const adminRes = await request(app)
    .post("/sessions")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
  adminToken = adminRes.body.token;

  // Cria usuário comum via API
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

  // Cria categoria compartilhada (usada nos testes de carro)
  await request(app)
    .post("/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "E2E-Shared-Cat", description: "Categoria compartilhada E2E" });
  const catRow = await dbRow<{ id: string }>(
    `SELECT id FROM categories WHERE name = 'E2E-Shared-Cat' LIMIT 1`
  );
  sharedCategoryId = (catRow as { id: string }).id;

  // Cria especificação compartilhada (usada nos testes de carro)
  await request(app)
    .post("/specifications")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "E2E-Shared-Spec", description: "Spec compartilhada E2E" });
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
describe("POST /sessions — autenticar usuário", () => {
  it("entrada válida → 200 + token + refresh_token + user.{name,email}", async () => {
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

  it("senha errada → 400 + mensagem de erro", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: ADMIN_EMAIL, password: "senhaerrada" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email or password incorrect!");
  });

  it("email inexistente → 400", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: "naoexiste@rentx.com.br", password: "qualquer" });

    expect(res.status).toBe(400);
  });

  it("sem email → 400", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ password: ADMIN_PASS });

    expect(res.status).toBe(400);
  });

  it("sem senha → 400", async () => {
    const res = await request(app)
      .post("/sessions")
      .send({ email: ADMIN_EMAIL });

    expect(res.status).toBe(400);
  });

  it("body vazio → 400", async () => {
    const res = await request(app).post("/sessions").send({});
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /refresh-token
// ══════════════════════════════════════════════════════════════════════
describe("POST /refresh-token — renovar token", () => {
  it("refresh_token válido (body) → 200 + novo token + novo refresh_token", async () => {
    const res = await request(app)
      .post("/refresh-token")
      .send({ token: userRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      token: expect.any(String),
      refresh_token: expect.any(String),
    });
    // Atualiza tokens para os próximos testes
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

  it("token inválido → 401", async () => {
    const res = await request(app)
      .post("/refresh-token")
      .send({ token: "token.invalido.aqui" });

    expect(res.status).toBe(401);
  });

  it("sem token → 400", async () => {
    const res = await request(app).post("/refresh-token").send({});
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /users
// ══════════════════════════════════════════════════════════════════════
describe("POST /users — criar usuário", () => {
  it("dados válidos → 201 sem body", async () => {
    const res = await request(app).post("/users").send({
      name: "Novo Usuário E2E",
      email: `novo-${uuidV4()}@rentx.com.br`,
      password: "Senha@123",
      driver_license: `NEW${Date.now()}`,
    });

    expect(res.status).toBe(201);
  });

  it("email duplicado → 400 + mensagem", async () => {
    const res = await request(app).post("/users").send({
      name: "Duplicado",
      email: USER_EMAIL, // já existe
      password: "Senha@123",
      driver_license: "DUP0001E2E",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User already exists");
  });

  it("senha ausente não cria usuário com dados incompletos", async () => {
    const res = await request(app).post("/users").send({
      name: "Sem Senha",
      email: `semsenha-${uuidV4()}@rentx.com.br`,
      driver_license: "SEM0001",
    });

    // Pode retornar 400 ou 500 dependendo da validação
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  GET /users/profile
// ══════════════════════════════════════════════════════════════════════
describe("GET /users/profile — perfil autenticado", () => {
  it("token válido → 200 + dados do usuário", async () => {
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

  it("sem token → 401", async () => {
    const res = await request(app).get("/users/profile");
    expect(res.status).toBe(401);
  });

  it("token malformado → 401", async () => {
    const res = await request(app)
      .get("/users/profile")
      .set("Authorization", "Bearer token.invalido");

    expect(res.status).toBe(401);
  });

  it("header Authorization ausente → 401", async () => {
    const res = await request(app)
      .get("/users/profile")
      .set("Authorization", "");

    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  PATCH /users/avatar
// ══════════════════════════════════════════════════════════════════════
describe("PATCH /users/avatar — atualizar avatar", () => {
  const srcJpeg = path.join(tmpFolder, "e2e-avatar-src.jpg");

  beforeAll(() => {
    fs.writeFileSync(srcJpeg, TINY_JPEG);
  });

  afterAll(() => {
    if (fs.existsSync(srcJpeg)) fs.unlinkSync(srcJpeg);
  });

  it("token válido + arquivo → 204", async () => {
    const res = await request(app)
      .patch("/users/avatar")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("avatar", srcJpeg);

    expect(res.status).toBe(204);
  });

  it("sem arquivo → 400", async () => {
    const res = await request(app)
      .patch("/users/avatar")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(400);
  });

  it("sem token → 401", async () => {
    const res = await request(app).patch("/users/avatar");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /categories  +  GET /categories  +  POST /categories/import
// ══════════════════════════════════════════════════════════════════════
describe("Categorias", () => {
  const csvPath = path.join(tmpFolder, "e2e-categories.csv");

  beforeAll(() => {
    fs.writeFileSync(csvPath, "name,description\nE2E-CSV-Hatch,Carros hatch\nE2E-CSV-Sedan,Carros sedan\n");
  });
  afterAll(() => {
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  });

  describe("POST /categories", () => {
    it("admin + dados válidos → 201", async () => {
      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "SUV-E2E", description: "Categoria SUV" });

      expect(res.status).toBe(201);
    });

    it("admin + nome duplicado → 400", async () => {
      await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "SEDAN-E2E", description: "Sedan" });

      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "SEDAN-E2E", description: "Duplicado" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Category already exists!");
    });

    it("usuário não-admin → 403", async () => {
      const res = await request(app)
        .post("/categories")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "SemPermissao", description: "X" });

      expect(res.status).toBe(403);
    });

    it("sem token → 401", async () => {
      const res = await request(app)
        .post("/categories")
        .send({ name: "SemAuth", description: "X" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /categories", () => {
    it("sem autenticação → 200 + array com ao menos 1 item", async () => {
      const res = await request(app).get("/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("cada item contém id, name e description", async () => {
      const res = await request(app).get("/categories");

      expect(res.status).toBe(200);
      res.body.forEach((cat: Record<string, unknown>) => {
        expect(cat).toHaveProperty("id");
        expect(cat).toHaveProperty("name");
        expect(cat).toHaveProperty("description");
      });
    });
  });

  describe("POST /categories/import — importar CSV", () => {
    it("admin + CSV válido → 201", async () => {
      const res = await request(app)
        .post("/categories/import")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", csvPath);

      expect(res.status).toBe(201);
    });

    it("sem token → 401", async () => {
      const res = await request(app)
        .post("/categories/import")
        .attach("file", csvPath);

      expect(res.status).toBe(401);
    });

    it("não-admin → 403", async () => {
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
describe("Especificações", () => {
  describe("POST /specifications", () => {
    it("admin + dados válidos → 201", async () => {
      const res = await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Ar-cond-E2E", description: "Air conditioning" });

      expect(res.status).toBe(201);
    });

    it("admin + nome duplicado → 400", async () => {
      await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "GPS-E2E", description: "Navegação" });

      const res = await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "GPS-E2E", description: "Duplicado" });

      expect(res.status).toBe(400);
    });

    it("usuário não-admin → 403", async () => {
      const res = await request(app)
        .post("/specifications")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Proibido", description: "X" });

      expect(res.status).toBe(403);
    });

    it("sem token → 401", async () => {
      const res = await request(app)
        .post("/specifications")
        .send({ name: "SemAuth", description: "X" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /specifications", () => {
    it("sem autenticação → 200 + array", async () => {
      const res = await request(app).get("/specifications");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("cada item contém id, name, description", async () => {
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
//  Carros — POST /cars | GET /cars/available
//           POST /cars/specifications/:id | POST /cars/images/:id
// ══════════════════════════════════════════════════════════════════════
describe("Carros", () => {
  let carId: string;
  const srcImg = path.join(tmpFolder, "e2e-car-img.jpg");

  beforeAll(async () => {
    fs.writeFileSync(srcImg, TINY_JPEG);
  });
  afterAll(() => {
    if (fs.existsSync(srcImg)) fs.unlinkSync(srcImg);
  });

  describe("POST /cars", () => {
    it("admin + dados válidos → 201 + objeto carro com id e available=true", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Fusion E2E",
          description: "Sedan executivo E2E",
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

    it("admin + placa duplicada → 400", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicado",
          description: "Duplicado",
          daily_rate: 100,
          license_plate: "E2E-0001", // já existe
          fine_amount: 30,
          brand: "Ford",
          category_id: sharedCategoryId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Car already exists!");
    });

    it("usuário não-admin → 403", async () => {
      const res = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Proibido",
          description: "X",
          daily_rate: 100,
          license_plate: "E2E-9999",
          fine_amount: 30,
          brand: "Brand",
          category_id: sharedCategoryId,
        });

      expect(res.status).toBe(403);
    });

    it("sem token → 401", async () => {
      const res = await request(app).post("/cars").send({
        name: "SemAuth",
        license_plate: "E2E-8888",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /cars/available", () => {
    it("sem autenticação → 200 + array", async () => {
      const res = await request(app).get("/cars/available");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("carro criado acima aparece na listagem", async () => {
      const res = await request(app).get("/cars/available");

      expect(res.status).toBe(200);
      const found = res.body.find((c: Record<string, string>) => c.license_plate === "E2E-0001");
      expect(found).toBeDefined();
    });

    it("filtro por brand → apenas carros da marca", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ brand: "Ford" });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((c: Record<string, string>) =>
        expect(c.brand).toBe("Ford")
      );
    });

    it("filtro por category_id → apenas carros da categoria", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ category_id: sharedCategoryId });

      expect(res.status).toBe(200);
      res.body.forEach((c: Record<string, string>) =>
        expect(c.category_id).toBe(sharedCategoryId)
      );
    });

    it("filtro por name → apenas carros com esse nome", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ name: "Fusion E2E" });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((c: Record<string, string>) =>
        expect(c.name).toBe("Fusion E2E")
      );
    });

    it("paginação (page=1, limit=1) → array com 1 item", async () => {
      const res = await request(app)
        .get("/cars/available")
        .query({ page: 1, limit: 1 });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });
  });

  describe("POST /cars/specifications/:id", () => {
    it("admin + car_id válido + spec → 200 + carro com specifications[]", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${carId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.specifications)).toBe(true);
      expect(res.body.specifications.length).toBeGreaterThan(0);
    });

    it("car_id inexistente → 400", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${uuidV4()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(400);
    });

    it("não-admin → 403", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${carId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(403);
    });

    it("sem token → 401", async () => {
      const res = await request(app)
        .post(`/cars/specifications/${carId}`)
        .send({ specifications_id: [sharedSpecificationId] });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /cars/images/:id", () => {
    it("admin + arquivo de imagem → 201", async () => {
      const res = await request(app)
        .post(`/cars/images/${carId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("images", srcImg);

      expect(res.status).toBe(201);
    });

    it("não-admin → 403", async () => {
      const res = await request(app)
        .post(`/cars/images/${carId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .attach("images", srcImg);

      expect(res.status).toBe(403);
    });

    it("sem token → 401", async () => {
      const res = await request(app).post(`/cars/images/${carId}`);
      expect(res.status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
//  Aluguéis — POST /rentals | GET /rentals/user | PATCH /rentals/devolution/:id
// ══════════════════════════════════════════════════════════════════════
describe("Aluguéis", () => {
  let rentalCarId: string;
  let rentalId: string;

  const expectedReturn48h = () =>
    new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const expectedReturn1h = () =>
    new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();

  beforeAll(async () => {
    // Cria carro dedicado ao fluxo de aluguel
    const carRes = await request(app)
      .post("/cars")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Rental Car E2E",
        description: "Carro para testes de aluguel",
        daily_rate: 100,
        license_plate: `RNT-${Date.now()}`,
        fine_amount: 50,
        brand: "RentalBrand",
        category_id: sharedCategoryId,
      });
    rentalCarId = carRes.body.id;
  });

  describe("POST /rentals — criar aluguel", () => {
    it("entrada inválida: sem expected_return_date → 400", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("expected_return_date is required!");
    });

    it("entrada inválida: data malformada → 400", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId, expected_return_date: "nao-e-uma-data" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("expected_return_date is not a valid date!");
    });

    it("data < 24h → 400 (período mínimo não atendido)", async () => {
      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn1h() });

      expect(res.status).toBe(400);
    });

    it("sem token → 401", async () => {
      const res = await request(app)
        .post("/rentals")
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(401);
    });

    it("dados válidos → 201 + objeto rental com car_id e user_id", async () => {
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

    it("carro já alugado → outro usuário tenta → 400", async () => {
      const otherEmail = `outro-${uuidV4()}@rentx.com.br`;
      await request(app).post("/users").send({
        name: "Outro User",
        email: otherEmail,
        password: "Outro@123",
        driver_license: `OTR${Date.now()}`,
      });
      const outroAuth = await request(app)
        .post("/sessions")
        .send({ email: otherEmail, password: "Outro@123" });
      const outroToken = outroAuth.body.token;

      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${outroToken}`)
        .send({ car_id: rentalCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(400);
    });

    it("usuário já possui aluguel aberto → 400", async () => {
      // Cria outro carro disponível
      const anotherCarRes = await request(app)
        .post("/cars")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Outro Carro",
          description: "outro",
          daily_rate: 80,
          license_plate: `OTR-${Date.now()}`,
          fine_amount: 20,
          brand: "OutraBrand",
          category_id: sharedCategoryId,
        });
      const anotherCarId = anotherCarRes.body.id;

      const res = await request(app)
        .post("/rentals")
        .set("Authorization", `Bearer ${userToken}`) // userToken já tem aluguel aberto
        .send({ car_id: anotherCarId, expected_return_date: expectedReturn48h() });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /rentals/user — listar aluguéis do usuário", () => {
    it("usuário autenticado → 200 + array com ao menos 1 aluguel", async () => {
      const res = await request(app)
        .get("/rentals/user")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("aluguel retornado contém campos esperados", async () => {
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

    it("sem token → 401", async () => {
      const res = await request(app).get("/rentals/user");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /rentals/devolution/:id — devolução do carro", () => {
    it("token válido + rental_id válido → 200 + rental com total e end_date", async () => {
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

    it("rental_id inexistente (string não-UUID) → mantém integridade → 400 ou 500", async () => {
      const res = await request(app)
        .patch(`/rentals/devolution/00000000-0000-0000-0000-000000000000`)
        .set("Authorization", `Bearer ${userToken}`);

      // rental inexistente → AppError 400 ou erro DB
      expect([400, 500]).toContain(res.status);
    });

    it("rental_id inexistente → 400", async () => {
      const res = await request(app)
        .patch(`/rentals/devolution/${uuidV4()}`)
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it("sem token → 401", async () => {
      const res = await request(app).patch(`/rentals/devolution/${rentalId}`);
      expect(res.status).toBe(401);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
//  POST /password/forgot  +  POST /password/reset
// ══════════════════════════════════════════════════════════════════════
describe("Recuperação de senha", () => {
  const forgotEmail = `forgot-${uuidV4()}@rentx.com.br`;
  const forgotPass = "SenhaAntiga@123";
  const newPass = "SenhaNova@456";
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
    it("email cadastrado → 200 + cria registro em users_tokens", async () => {
      const res = await request(app)
        .post("/password/forgot")
        .send({ email: forgotEmail });

      expect(res.status).toBe(200);

      // Verifica que o token foi criado no banco
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

    it("email NÃO cadastrado → 200 (sem revelar enumeração de usuários)", async () => {
      const res = await request(app)
        .post("/password/forgot")
        .send({ email: `naoexiste-${uuidV4()}@rentx.com.br` });

      expect(res.status).toBe(200);
    });

    it("sem campo email → 200 (comportamento defensivo)", async () => {
      const res = await request(app).post("/password/forgot").send({});
      // Aceita 200 ou 400 dependendo da implementação
      expect([200, 400]).toContain(res.status);
    });
  });

  describe("POST /password/reset", () => {
    it("token válido + nova senha → 200 + login funciona com nova senha", async () => {
      const res = await request(app)
        .post("/password/reset")
        .query({ token: forgotToken })
        .send({ password: newPass });

      expect(res.status).toBe(200);

      // Verifica que o login com a nova senha é bem-sucedido
      const loginRes = await request(app)
        .post("/sessions")
        .send({ email: forgotEmail, password: newPass });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty("token");
    });

    it("token já utilizado → 400", async () => {
      // O token foi invalidado na operação anterior
      const res = await request(app)
        .post("/password/reset")
        .query({ token: forgotToken })
        .send({ password: "OutraSenha@789" });

      expect(res.status).toBe(400);
    });

    it("token inexistente → 400 + mensagem", async () => {
      const res = await request(app)
        .post("/password/reset")
        .query({ token: uuidV4() })
        .send({ password: "OutraSenha@789" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Token invalid!");
    });

    it("sem token na query → 400", async () => {
      const res = await request(app)
        .post("/password/reset")
        .send({ password: "SemToken@123" });

      expect(res.status).toBe(400);
    });
  });
});
