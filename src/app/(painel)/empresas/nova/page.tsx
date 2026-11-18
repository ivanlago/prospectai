import { requireAdmin } from "@/auth";
import { PageHeader } from "@/components/controls";
import { CompanyForm } from "@/components/company-form";

export default async function NewCompany() {
  await requireAdmin();
  return <>
    <PageHeader title="Nova empresa" description="Adicione uma empresa manualmente ao CRM." />
    <section className="panel padded"><CompanyForm /></section>
  </>;
}
