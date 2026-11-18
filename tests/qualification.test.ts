import { expect, it } from "vitest";
import { assessOpportunity, classifyWebsite, reviewForm } from "../src/features/qualification";

const baseline = {
  evidence: "Consulta manual por nome e cidade.", website: "", gapWeight: 30, infoWeight: 20,
  priorityWeight: 20, regionWeight: 15, staleWeight: 15, threshold: 50, information: "on",
};

it("diferencia rede social, plataforma e domínio candidato", () => {
  expect(classifyWebsite("https://m.facebook.com/empresa")).toBe("social");
  expect(classifyWebsite("https://empresa.wixsite.com/")).toBe("platform");
  expect(classifyWebsite("https://facebook.com.example.org")).toBe("domain");
  expect(classifyWebsite("javascript:alert(1)")).toBe("invalid");
});

it("separa ausência na fonte de ausência após revisão", () => {
  const listed = reviewForm.parse({ ...baseline, presence: "website_not_listed" });
  const reviewed = reviewForm.parse({ ...baseline, presence: "website_not_found" });
  expect(assessOpportunity(listed)).toMatchObject({ score: 20, qualified: false });
  expect(assessOpportunity(reviewed)).toMatchObject({ score: 50, qualified: true });
});

it("valida a URL em relação à situação e limita o total a 100", () => {
  expect(reviewForm.safeParse({ ...baseline, presence: "website_found", website: "https://instagram.com/empresa" }).success).toBe(false);
  const input = reviewForm.parse({ ...baseline, presence: "website_not_found", gapWeight: 100, infoWeight: 100 });
  expect(assessOpportunity(input).score).toBe(100);
});
