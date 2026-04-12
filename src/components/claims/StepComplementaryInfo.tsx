import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

function YesNo({ label, value, onValueChange, id }: { label: string; value: boolean; onValueChange: (v: boolean) => void; id: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <RadioGroup value={value ? "yes" : "no"} onValueChange={(v) => onValueChange(v === "yes")} className="flex gap-4">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${id}-y`} />
          <Label htmlFor={`${id}-y`} className="text-sm">Sí</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${id}-n`} />
          <Label htmlFor={`${id}-n`} className="text-sm">No</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export default function StepComplementaryInfo({ form, onChange }: Props) {
  return (
    <div className="space-y-5">
      <h4 className="font-medium text-sm text-muted-foreground">Sección 5 — Datos complementarios</h4>

      {/* Otra póliza vigente */}
      <YesNo label="¿Actualmente cuentas con otra póliza vigente?" value={form.has_other_active_policy} onValueChange={(v) => onChange({ has_other_active_policy: v })} id="oap" />
      {form.has_other_active_policy && (
        <Input placeholder="¿Cuál es?" value={form.other_active_policy_name} onChange={(e) => onChange({ other_active_policy_name: e.target.value })} />
      )}

      {/* Seguro previo con otra compañía */}
      <YesNo label="¿Has tenido seguro de gastos médicos con otra compañía?" value={form.had_prior_insurance} onValueChange={(v) => onChange({ had_prior_insurance: v })} id="hpi" />
      {form.had_prior_insurance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Compañía</Label>
            <Input value={form.prior_insurance_company} onChange={(e) => onChange({ prior_insurance_company: e.target.value })} />
          </div>
          <div>
            <Label>Fecha inicio vigencia</Label>
            <Input type="date" value={form.prior_insurance_start} onChange={(e) => onChange({ prior_insurance_start: e.target.value })} />
          </div>
        </div>
      )}

      {/* Seguro actual con otra compañía */}
      <YesNo label="¿Actualmente tienes seguro de gastos médicos con otra compañía?" value={form.has_current_other_insurance} onValueChange={(v) => onChange({ has_current_other_insurance: v })} id="hcoi" />
      {form.has_current_other_insurance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Compañía</Label>
            <Input value={form.current_other_company} onChange={(e) => onChange({ current_other_company: e.target.value })} />
          </div>
          <div>
            <Label>Fecha inicio</Label>
            <Input type="date" value={form.current_other_start} onChange={(e) => onChange({ current_other_start: e.target.value })} />
          </div>
          <div>
            <Label>Fecha fin</Label>
            <Input type="date" value={form.current_other_end} onChange={(e) => onChange({ current_other_end: e.target.value })} />
          </div>
        </div>
      )}

      {/* Gastos previos MetLife */}
      <YesNo label="¿Has presentado gastos anteriores por este padecimiento en MetLife?" value={form.has_prior_metlife_claims} onValueChange={(v) => onChange({ has_prior_metlife_claims: v })} id="hpmc" />
      {form.has_prior_metlife_claims && (
        <Input placeholder="Número de siniestro" value={form.prior_metlife_siniestro} onChange={(e) => onChange({ prior_metlife_siniestro: e.target.value })} />
      )}

      {/* Gastos previos otra compañía */}
      <YesNo label="¿Has presentado gastos por este padecimiento en otra compañía?" value={form.has_prior_claims} onValueChange={(v) => onChange({ has_prior_claims: v })} id="hpc" />
      {form.has_prior_claims && (
        <Input placeholder="Compañía / No. de siniestro" value={form.prior_company} onChange={(e) => onChange({ prior_company: e.target.value })} />
      )}

      {/* PEP */}
      <YesNo label="¿Tú, tu cónyuge o familiar desempeña funciones públicas destacadas? (PEP)" value={form.is_pep} onValueChange={(v) => onChange({ is_pep: v })} id="pep" />

      {/* Trámite previo */}
      {!form.is_initial_claim && (
        <>
          <YesNo label="¿Estás enviando información solicitada en un trámite previo?" value={form.is_sending_prior_info} onValueChange={(v) => onChange({ is_sending_prior_info: v })} id="spi" />
          {form.is_sending_prior_info && (
            <Input placeholder="Folio (DCN) del trámite anterior" value={form.prior_dcn_folio} onChange={(e) => onChange({ prior_dcn_folio: e.target.value })} />
          )}
        </>
      )}

      {/* Autoridad en accidente */}
      {form.cause === "accidente" && (
        <>
          <YesNo label="¿Tomó conocimiento del accidente alguna autoridad competente?" value={form.authority_knowledge} onValueChange={(v) => onChange({ authority_knowledge: v })} id="ak" />
          {form.authority_knowledge && (
            <Input placeholder="¿Cuál autoridad?" value={form.authority_name} onChange={(e) => onChange({ authority_name: e.target.value })} />
          )}
        </>
      )}
    </div>
  );
}
