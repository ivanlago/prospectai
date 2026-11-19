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
  await page.getByRole("link", { name: "Gerar demonstração de site" }).click();
  await expect(page.getByLabel("Template")).toHaveValue("auto");
  await page.getByLabel("Serviços confirmados").fill("Manutenção preventiva");
  await page.getByLabel("E-mail comercial autorizado").fill("contato@example.test");
  await page.getByRole("checkbox", { name: /autorizo o envio/ }).check();
  await page.getByRole("button", { name: "Gerar demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Cuidado em cada detalhe" })).toBeVisible();
  await expect(page.getByText("Manutenção preventiva", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "contato@example.test" })).toHaveAttribute("href", "mailto:contato@example.test");
  await expect(page.getByText("Prévia demonstrativa independente. Não representa um site oficial da empresa.")).toBeVisible();
  const demoURL = page.url();
  await page.getByRole("link", { name: "Comparar layouts" }).click();
  await expect(page.getByRole("heading", { name: "Cuidado em cada detalhe" })).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Clínica redesenhada" }).getByText("Manutenção preventiva")).toBeVisible();
  await page.getByRole("link", { name: "Clínica redesenhada", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cuidado em cada detalhe" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Enviar e-mail" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("article")).toBeVisible();
  expect(await page.getByRole("article").evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(demoURL);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Cuidado em cada detalhe" })).toBeVisible();
  await page.getByRole("link", { name: "Ver histórico" }).click();
  await expect(page.getByRole("cell", { name: "300 / 110" })).toBeVisible();
  await page.goto(companyURL);
  await page.getByRole("link", { name: "Gerar demonstração de site" }).click();
  await page.getByLabel("Template").selectOption("beauty");
  await page.getByLabel("Serviços confirmados").fill("Cuidados faciais");
  await page.getByLabel("E-mail comercial autorizado").fill("agenda@example.test");
  await page.getByLabel("Foto autorizada da empresa").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==", "base64"),
  });
  await page.getByRole("checkbox", { name: /autorizo o envio/ }).check();
  await page.getByRole("button", { name: "Gerar demonstração" }).click();
  await expect(page.getByRole("link", { name: "Layout original" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Comparar layouts" }).click();
  const editorial = page.getByRole("region", { name: "Beleza editorial" });
  await expect(editorial.getByText("Cuidados faciais", { exact: true })).toBeVisible();
  await expect(editorial.getByRole("img", { name: "Foto fornecida para Oficina Central" })).toBeVisible();
  await expect(editorial.getByRole("link", { name: "agenda@example.test" })).toHaveAttribute("href", "mailto:agenda@example.test");
  await page.getByRole("link", { name: "Beleza editorial" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const beauty = page.getByRole("article");
  await expect(beauty).toBeVisible();
  expect(await beauty.evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
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
  await page.getByRole("link", { name: "Revisar", exact: true }).click();
  await page.getByLabel("Presença digital").selectOption("website_not_found");
  await page.getByLabel("Evidência da revisão").fill("Consulta manual pelo nome e pela cidade.");
  await page.getByRole("checkbox", { name: "Informações comerciais confirmadas" }).check();
  await page.getByRole("button", { name: "Salvar revisão" }).click();
  await expect(page.getByText("50/100 · Qualificada")).toBeVisible();
  await page.getByRole("checkbox", { name: "Confirmo o uso dos dados de origem sob ODbL." }).check();
  await page.getByRole("button", { name: "Importar para o CRM" }).click();
  await expect(page.getByRole("link", { name: "Registro de origem" })).toBeVisible();
  await page.goto("/pesquisas");
  await page.getByRole("link", { name: "Oficinas em Salvador" }).click();
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
  await page.goto(demoURL);
  await expect(page).toHaveURL(/\/entrar$/);
});

for (const city of ["Salvador", "Lauro de Freitas", "Camaçari"]) {
  test(`consulta restaurantes no extrato real de ${city}`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_REAL_EXTRACT !== "true", "Requer o extrato local da Geofabrik.");
    const name = `Restaurantes no extrato de ${city}`;
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill("admin@example.test");
    await page.getByLabel("Senha").fill("senha-apenas-do-teste");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
    await page.goto("/pesquisas/nova");
    await page.getByLabel("Nome da pesquisa").fill(name);
    await page.getByLabel("Estado").fill("BA");
    await page.getByLabel("Cidade").fill(city);
    await page.getByLabel("Segmento").fill("Restaurantes");
    await page.getByLabel("Limite de resultados").fill("5");
    await page.getByRole("button", { name: "Salvar pesquisa" }).click();
    await page.getByRole("link", { name }).click();
    await page.getByLabel("Fonte").selectOption("openstreetmap-geofabrik");
    await page.getByLabel("Categoria OpenStreetMap").selectOption("restaurant");
    await page.getByRole("button", { name: "Executar pesquisa" }).click();
    await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
    await expect(page.getByText(`Extrato Geofabrik de ${city} · versão de`)).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(6);
  });
}

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
