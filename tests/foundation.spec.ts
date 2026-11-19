import { expect, test } from "@playwright/test";

test("protege rotas e bloqueia cadastro público", async ({ page, request }) => {
  await page.goto("/empresas");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/configuracoes");
  await expect(page).toHaveURL(/\/entrar$/);
  const response = await request.post("/api/auth/sign-up/email", { data: { email: "outro@example.test", password: "senha-apenas-do-teste" } });
  expect(response.status()).toBe(403);
});

test("responde com 404 para uma demonstração expirada ou sem token válido", async ({ request }) => {
  for (const token of ["invalido", Buffer.alloc(32, 163).toString("base64url")]) {
    const response = await request.get(`/demo/${token}`);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain("Título da prévia expirada");
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
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
  await page.getByLabel("Benefícios ou diferenciais confirmados").fill("Atendimento com hora marcada");
  await page.getByLabel("E-mail comercial autorizado").fill("contato@example.test");
  await page.getByRole("checkbox", { name: /autorizo o envio/ }).check();
  await page.getByRole("button", { name: "Gerar demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Cuidado em cada detalhe" })).toBeVisible();
  await expect(page.getByText("Manutenção preventiva", { exact: true })).toBeVisible();
  await expect(page.getByText("Atendimento com hora marcada", { exact: true })).toBeVisible();
  await expect(page.getByText("Consulte a empresa para conhecer os detalhes deste serviço.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Prévia composta" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Galeria" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole("article").evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole("link", { name: "contato@example.test" })).toHaveAttribute("href", "mailto:contato@example.test");
  await expect(page.getByText("Prévia demonstrativa independente. Não representa um site oficial da empresa.")).toBeVisible();
  const demoURL = page.url();
  await page.getByRole("link", { name: "Compartilhar demonstração" }).click();
  await page.getByLabel("Validade do link").selectOption("1");
  await page.getByRole("checkbox", { name: /aprovo o conteúdo exibido/ }).check();
  await page.getByRole("button", { name: "Criar link de demonstração" }).click();
  const publicInput = page.getByRole("textbox", { name: "Link de demonstração" });
  await expect(publicInput).toHaveValue(/\/demo\/[\w-]{43}$/);
  const publicURL = await publicInput.inputValue();
  const shareURL = page.url();
  const visitor = await page.context().browser()!.newContext();
  const publicPage = await visitor.newPage();
  const publicResponse = await publicPage.goto(publicURL);
  expect(publicResponse?.status()).toBe(200);
  expect(publicResponse?.headers()["cache-control"]).toContain("no-store");
  expect(publicResponse?.headers()["x-robots-tag"]).toContain("noindex");
  expect(publicResponse?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(publicPage.getByRole("heading", { name: "Cuidado em cada detalhe" })).toBeVisible();
  await expect(publicPage.getByText("contato@example.test")).toHaveCount(0);
  await expect(publicPage.getByText("Retornar na sexta-feira.")).toHaveCount(0);
  await expect(publicPage.getByRole("navigation", { name: "Menu principal" })).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar à demonstração" }).click();
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
  await page.getByRole("link", { name: "Editar demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Editor visual" })).toBeVisible();
  const editURL = page.url();
  const stale = await page.context().newPage();
  await stale.goto(editURL);
  await page.getByRole("button", { name: "Celular", exact: true }).click();
  await expect(page.getByRole("article")).toHaveAttribute("data-viewport", "mobile");
  await page.getByLabel("Título principal").fill("Atendimento com hora marcada");
  await page.getByLabel("Paleta de cores").selectOption("floresta");
  await page.getByRole("button", { name: "Serviços", exact: true }).click();
  await page.getByRole("button", { name: "Descer seção" }).click();
  await page.getByLabel("Ocultar seção").check();
  await expect(page.getByRole("article").getByText("Manutenção preventiva", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Revisão 1 salva.")).toBeVisible();
  await stale.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(stale.getByText("Outra revisão foi salva.", { exact: false })).toBeVisible();
  await stale.close();
  await page.getByRole("link", { name: "Abrir prévia salva" }).click();
  await expect(page.getByRole("article")).toHaveAttribute("data-palette", "floresta");
  await expect(page.getByRole("heading", { name: "Atendimento com hora marcada" })).toBeVisible();
  await page.goto(editURL);
  await page.getByRole("button", { name: "Restaurar revisão" }).click();
  await expect(page.getByText("Revisão 2 salva.")).toBeVisible();
  await expect(page.getByRole("article").getByRole("heading", { name: "Cuidado em cada detalhe" })).toBeVisible();
  await page.getByLabel("O que você quer mudar?").fill("Troque a paleta para azul e branco.");
  await page.getByRole("checkbox", { name: /Autorizo enviar o pedido/ }).check();
  await page.getByRole("button", { name: "Gerar proposta" }).click();
  await expect(page.getByRole("heading", { name: "Alterações propostas" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "oceano" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveAttribute("data-palette", "template");
  await page.getByRole("button", { name: "Aplicar proposta" }).click();
  await expect(page.getByText("Revisão 3 salva.")).toBeVisible();
  await expect(page.getByRole("article")).toHaveAttribute("data-palette", "oceano");
  await expect(page.getByRole("article").getByRole("heading", { name: "Conheça a nossa oficina" })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { name: "Cuidado em cada detalhe" })).toBeVisible();
  await expect(publicPage.getByRole("article")).toHaveAttribute("data-palette", "template");
  await page.getByRole("button", { name: "Desfazer alteração da IA" }).click();
  await expect(page.getByText("Revisão 4 salva.")).toBeVisible();
  await expect(page.getByRole("article")).toHaveAttribute("data-palette", "template");
  await page.goto(shareURL);
  await expect(publicInput).toHaveCount(0);
  await page.getByRole("button", { name: "Revogar link" }).click();
  await expect(page.getByRole("cell", { name: "Revogado" })).toBeVisible();
  expect((await publicPage.reload())?.status()).toBe(404);
  await page.getByRole("checkbox", { name: /aprovo o conteúdo exibido/ }).check();
  await page.getByRole("button", { name: "Criar link de demonstração" }).click();
  await expect(publicInput).toHaveValue(/\/demo\/[\w-]{43}$/);
  const attachedURL = await publicInput.inputValue();
  expect((await publicPage.goto(attachedURL))?.status()).toBe(200);
  await visitor.close();
  await page.goto(editURL);
  await page.getByRole("link", { name: "Abrir prévia salva" }).click();
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
  await page.getByRole("checkbox", { name: /permissão para usar a foto/ }).check();
  await page.getByRole("checkbox", { name: /autorizo o envio/ }).check();
  await page.getByRole("button", { name: "Gerar demonstração" }).click();
  await expect(page.getByRole("link", { name: "Prévia composta" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("img", { name: "Foto fornecida para Oficina Central" })).toBeVisible();
  await page.getByRole("link", { name: "Comparar layouts" }).click();
  const editorial = page.getByRole("region", { name: "Beleza editorial" });
  await expect(editorial.getByText("Cuidados faciais", { exact: true })).toBeVisible();
  await expect(editorial.getByRole("img", { name: "Foto fornecida para Oficina Central" })).toBeVisible();
  await expect(editorial.getByRole("link", { name: "agenda@example.test" })).toHaveAttribute("href", "mailto:agenda@example.test");
  await page.getByRole("link", { name: "Beleza editorial" }).click();
  await expect(page).toHaveURL(/\?layout=editorial$/);
  await page.setViewportSize({ width: 390, height: 844 });
  const beauty = page.getByRole("article");
  await expect(beauty).toBeVisible();
  expect(await beauty.evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(companyURL);
  await page.getByRole("link", { name: "Gerar demonstração de site" }).click();
  await page.getByLabel("Template").selectOption({ label: "Clínicas dentárias" });
  await page.getByLabel("Serviços confirmados").fill("Limpeza dental");
  await page.getByLabel("WhatsApp comercial autorizado").fill("5571999999999");
  await page.getByRole("checkbox", { name: /autorizo o envio/ }).check();
  await page.getByRole("button", { name: "Gerar demonstração" }).click();
  await expect(page.getByRole("link", { name: "Prévia composta" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Tratamentos e serviços" })).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp", exact: true })).toHaveAttribute("href", "https://wa.me/5571999999999");
  await page.getByRole("link", { name: "Comparar layouts" }).click();
  for (const name of ["Layout de clínicas", "Layout odontológico"]) {
    await expect(page.getByRole("region", { name }).getByText("Limpeza dental", { exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "Layout odontológico" }).click();
  await expect(page).toHaveURL(/\?layout=odontologia$/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByRole("article").evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/empresas?q=Central&etapa=qualified");
  await expect(page.getByRole("link", { name: "Oficina Central" })).toBeVisible();
  await page.goto("/?periodo=7");
  await expect(page.getByRole("link", { name: "Oficina Central" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Qualificado" })).toHaveAttribute("value", "1");

  await page.getByRole("link", { name: "Encontrar empresas", exact: true }).click();
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
  await page.getByLabel(/^Fonte/).selectOption("openstreetmap");
  await page.getByLabel("Categoria OpenStreetMap").selectOption("cafe");
  await page.getByRole("button", { name: "Executar pesquisa" }).click();
  await expect(page.getByRole("heading", { name: "Resultados da pesquisa" })).toBeVisible();
  await expect(page.getByText("Cafeteria de teste 01", { exact: true })).toBeVisible();
  const originalRun = page.url();
  await page.getByRole("button", { name: "Reexecutar consulta" }).click();
  await expect(page.getByText("Resultados reutilizados de uma consulta recente.", { exact: false })).toBeVisible();
  expect(page.url()).not.toBe(originalRun);
  await page.getByRole("link", { name: "Tabela", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(21);
  await page.getByLabel(/^Presença digital/).selectOption("listed");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByText("0 de 21 empresas")).toBeVisible();
  await page.getByLabel(/^Presença digital/).selectOption("unlisted");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByText("21 de 21 empresas")).toBeVisible();
  await page.getByRole("link", { name: "Cards", exact: true }).click();
  await expect(page.getByRole("link", { name: "Cards", exact: true })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Selecionar Cafeteria de teste 01" }).check();
  await page.getByRole("button", { name: "Mostrar somente selecionadas" }).click();
  await expect(page.getByText("Cafeteria de teste 02", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Limpar seleção" }).click();
  await expect(page.getByText("Cafeteria de teste 02", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Próxima" }).click();
  await expect(page.getByText("Cafeteria de teste 21", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Revisar", exact: true }).click();
  await expect(page).toHaveURL(/\/pesquisas\/revisao\//);
  await page.getByLabel("Evidência da revisão").fill("Consulta manual pelo nome e pela cidade.");
  await page.getByRole("combobox", { name: "Presença digital", exact: true }).selectOption("website_not_found");
  await page.getByRole("checkbox", { name: "Informações comerciais confirmadas" }).check();
  await page.getByRole("button", { name: "Salvar revisão" }).click();
  await expect(page.getByText("50/100 · Qualificada")).toBeVisible();
  await page.getByRole("checkbox", { name: "Confirmo o uso dos dados de origem sob ODbL." }).check();
  await page.getByRole("button", { name: "Importar para o CRM" }).click();
  await expect(page.getByRole("link", { name: "Registro de origem" })).toBeVisible();
  await page.goto("/pesquisas");
  await page.getByRole("link", { name: "Oficinas em Salvador" }).click();
  await expect(page.getByText("Concluída", { exact: true })).toHaveCount(2);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir pesquisa" }).click();
  await expect(page.getByText("Pesquisa excluída.")).toBeVisible();

  await page.goto(companyURL);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Excluir empresa" }).click();
  await expect(page.getByText("Empresa excluída.")).toBeVisible();
  expect((await page.request.get(attachedURL)).status()).toBe(404);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/oportunidades");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto(demoURL);
  await expect(page).toHaveURL(/\/entrar$/);
});

test("painel prioriza a pesquisa e mantém a navegação acessível no desktop e no celular", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("admin@example.test");
  await page.getByLabel("Senha").fill("senha-apenas-do-teste");
  await page.getByRole("button", { name: "Entrar" }).click();

  const nav = page.getByRole("navigation", { name: "Menu principal" });
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  const collapse = page.getByRole("button", { name: "Barra lateral compacta" });
  await collapse.focus();
  await page.keyboard.press("Enter");
  await expect(collapse).toHaveAttribute("aria-pressed", "true");
  await expect(nav.getByRole("link", { name: "CRM" })).toBeVisible();
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("link", { name: "Iniciar pesquisa" }).click();
  await expect(page.getByRole("heading", { name: "Nova pesquisa" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Encontrar empresas" })).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 23, 38)");

  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(nav).toBeHidden();
  await expect(page.getByRole("link", { name: "Iniciar pesquisa" })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  const menu = page.getByRole("button", { name: "Abrir menu" });
  await menu.click();
  await nav.getByRole("link", { name: "Configurações" }).focus();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(nav).toBeHidden();
  await menu.click();
  await nav.getByRole("link", { name: "Configurações" }).click();
  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();
  await expect(nav).toBeHidden();
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
    await page.getByLabel(/^Fonte/).selectOption("openstreetmap-geofabrik");
    await expect(page.getByLabel("Avaliação mínima")).toHaveCount(0);
    await page.getByLabel("Categoria da fonte").selectOption("restaurant");
    await page.getByRole("button", { name: "Salvar e executar" }).click();
    await expect(page.getByText("Concluída", { exact: true })).toBeVisible();
    await expect(page.getByText(`Extrato Geofabrik de ${city} · versão de`)).toBeVisible();
    await page.getByRole("link", { name: "Tabela", exact: true }).click();
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
