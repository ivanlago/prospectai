import { expect, test } from "@playwright/test";

test("protege rotas e bloqueia cadastro público", async ({ page, request }) => {
  await page.goto("/empresas");
  await expect(page).toHaveURL(/\/entrar$/);
  const response = await request.post("/api/auth/sign-up/email", { data: { email: "outro@example.test", password: "senha-apenas-do-teste" } });
  expect(response.status()).toBe(403);
});

test("admin cria, edita e exclui registros, move etapa e encerra sessão", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("admin@example.test");
  await page.getByLabel("Senha").fill("senha-apenas-do-teste");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

  await page.getByRole("link", { name: "Nova empresa" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Oficina Exemplo");
  await page.getByLabel("Segmento").fill("Automotivo");
  await page.getByLabel("Estado").fill("Bahia");
  await page.getByLabel("Cidade").fill("Salvador");
  await page.getByRole("button", { name: "Salvar empresa" }).click();
  await expect(page.getByText("Empresa salva.")).toBeVisible();
  const companyURL = page.url().split("?")[0];

  await page.getByLabel("Etapa do CRM").selectOption("qualified");
  await page.getByRole("button", { name: "Mover" }).click();
  await expect(page.getByText("Novo → Qualificado")).toBeVisible();
  await page.getByLabel("Nova nota").fill("Retornar na sexta-feira.");
  await page.getByRole("button", { name: "Adicionar nota" }).click();
  await expect(page.getByText("Retornar na sexta-feira.", { exact: true })).toBeVisible();

  await page.getByLabel("Nome", { exact: true }).fill("Oficina Central");
  await page.getByRole("button", { name: "Salvar empresa" }).click();
  await expect(page.getByRole("heading", { name: "Oficina Central" })).toBeVisible();
  await page.goto("/empresas?q=Central&etapa=qualified");
  await expect(page.getByRole("link", { name: "Oficina Central" })).toBeVisible();
  await page.goto("/?periodo=7");
  await expect(page.getByRole("link", { name: "Oficina Central" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Qualificado" })).toHaveAttribute("value", "1");

  await page.getByRole("link", { name: "Pesquisas", exact: true }).click();
  await page.getByRole("link", { name: "Nova pesquisa" }).click();
  await page.getByLabel("Nome da pesquisa").fill("Oficinas em Salvador");
  await page.getByLabel("Estado").fill("Bahia");
  await page.getByLabel("Cidade").fill("Salvador");
  await page.getByLabel("Segmento").fill("Oficinas");
  await page.getByRole("button", { name: "Salvar pesquisa" }).click();
  await page.getByRole("link", { name: "Oficinas em Salvador" }).click();
  await expect(page.getByLabel("Cidade")).toHaveValue("Salvador");
  await page.getByLabel("Bairro ou região").fill("Pituaçu");
  await page.getByLabel("Limite de resultados").fill("25");
  await page.getByRole("button", { name: "Salvar pesquisa" }).click();
  await page.getByRole("link", { name: "Oficinas em Salvador" }).click();
  await expect(page.getByLabel("Bairro ou região")).toHaveValue("Pituaçu");
  await page.getByLabel("Fonte").selectOption("openstreetmap");
  await page.getByLabel("Categoria OpenStreetMap").selectOption("cafe");
  await page.getByRole("button", { name: "Executar pesquisa" }).click();
  await expect(page.getByRole("heading", { name: "Resultados da pesquisa" })).toBeVisible();
  await expect(page.getByText("Cafeteria de teste 01", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Próxima" }).click();
  await expect(page.getByText("Cafeteria de teste 21", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Voltar às pesquisas" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir pesquisa" }).click();
  await expect(page.getByText("Pesquisa excluída.")).toBeVisible();

  await page.goto(companyURL);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir empresa" }).click();
  await expect(page.getByText("Empresa excluída.")).toBeVisible();
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/oportunidades");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("consulta cafeterias no extrato real de Salvador", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_REAL_EXTRACT !== "true", "Requer o extrato local da Geofabrik.");
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("admin@example.test");
  await page.getByLabel("Senha").fill("senha-apenas-do-teste");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  await page.goto("/pesquisas/nova");
  await page.getByLabel("Nome da pesquisa").fill("Cafeterias no extrato de Salvador");
  await page.getByLabel("Estado").fill("BA");
  await page.getByLabel("Cidade").fill("Salvador");
  await page.getByLabel("Segmento").fill("Cafeterias");
  await page.getByLabel("Limite de resultados").fill("5");
  await page.getByRole("button", { name: "Salvar pesquisa" }).click();
  await page.getByRole("link", { name: "Cafeterias no extrato de Salvador" }).click();
  await page.getByLabel("Fonte").selectOption("openstreetmap-geofabrik");
  await page.getByLabel("Categoria OpenStreetMap").selectOption("cafe");
  await page.getByRole("button", { name: "Executar pesquisa" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
  await expect(page.getByText(/Extrato Geofabrik de Salvador · versão de/)).toBeVisible();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(6);
});

test("limita tentativas de login com contagem persistente", async ({ request }) => {
  const attempts = await Promise.all(Array.from({ length: 7 }, () =>
    request.post("/api/auth/sign-in/email", {
      headers: { origin: "http://127.0.0.1:3841" },
      data: { email: "admin@example.test", password: "credencial-incorreta" },
    }),
  ));
  expect(attempts.some(response => response.status() === 429)).toBe(true);
  expect(attempts.every(response => [401, 429].includes(response.status()))).toBe(true);
});
