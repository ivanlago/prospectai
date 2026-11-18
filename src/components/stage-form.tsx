import { setStage } from "@/app/(painel)/actions";
import { stageNames } from "@/domain";

export function StageForm({ id, stage }: { id: string; stage: keyof typeof stageNames }) {
  return <form action={setStage} className="toolbar">
    <input type="hidden" name="companyId" value={id} />
    <select name="stage" aria-label="Etapa do CRM" defaultValue={stage} key={stage}>
      {Object.entries(stageNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
    </select>
    <button className="button">Mover</button>
  </form>;
}
