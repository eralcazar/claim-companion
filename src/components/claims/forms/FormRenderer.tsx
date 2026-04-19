import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldDefinition, FormDefinition, SectionDefinition } from "./types";
import { computeAge, isValidCLABE, isValidCURP, isValidRFC } from "./shared/validators";
import DynamicTable from "./shared/DynamicTable";
import SignatureCanvas from "./shared/SignatureCanvas";

interface Props {
  definition: FormDefinition;
  section: SectionDefinition;
  data: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}

export default function FormRenderer({ section, data, onChange }: Props) {
  // Renderiza una sola sección — el wizard maneja la navegación entre secciones.
  if (section.kind === "dynamic_table") {
    return (
      <div className="space-y-3">
        {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
        <DynamicTable
          rows={(data[section.tableName!] as any[]) || []}
          columns={section.columns || []}
          onChange={(rows) => onChange({ [section.tableName!]: rows })}
          maxRows={section.maxRows}
          showTotal={section.showTotal}
          amountKey="amount"
        />
      </div>
    );
  }

  if (section.kind === "dynamic_doctors") {
    const key = section.doctorsName || "doctors";
    const max = section.maxDoctors || 3;
    const doctors: any[] = data[key] || [{}];
    const update = (i: number, patch: any) => {
      const next = doctors.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
      onChange({ [key]: next });
    };
    const add = () => doctors.length < max && onChange({ [key]: [...doctors, {}] });
    const remove = (i: number) => onChange({ [key]: doctors.filter((_, idx) => idx !== i) });
    return (
      <div className="space-y-4">
        {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
        {doctors.map((doc, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Médico {i + 1}</span>
              {doctors.length > 1 && (
                <button type="button" className="text-xs text-destructive" onClick={() => remove(i)}>Quitar</button>
              )}
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de participación</Label>
                <Select value={doc.participation || ""} onValueChange={(v) => update(i, { participation: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interconsultante">Interconsultante</SelectItem>
                    <SelectItem value="cirujano">Cirujano</SelectItem>
                    <SelectItem value="anestesiologo">Anestesiólogo</SelectItem>
                    <SelectItem value="ayudantia">Ayudantía</SelectItem>
                    <SelectItem value="otra">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {doc.participation === "otra" && (
                <div className="space-y-1">
                  <Label className="text-xs">¿Cuál?</Label>
                  <Input value={doc.participation_other || ""} onChange={(e) => update(i, { participation_other: e.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Apellido paterno</Label>
                  <Input value={doc.paternal || ""} onChange={(e) => update(i, { paternal: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Apellido materno</Label>
                  <Input value={doc.maternal || ""} onChange={(e) => update(i, { maternal: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre(s)</Label>
                <Input value={doc.first_name || ""} onChange={(e) => update(i, { first_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Especialidad</Label>
                <Input value={doc.specialty || ""} onChange={(e) => update(i, { specialty: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cédula profesional</Label>
                  <Input value={doc.license || ""} onChange={(e) => update(i, { license: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cédula de especialidad</Label>
                  <Input value={doc.specialty_license || ""} onChange={(e) => update(i, { specialty_license: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Presupuesto de honorarios ($)</Label>
                <Input type="number" min="0" step="0.01" value={doc.fees || ""} onChange={(e) => update(i, { fees: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
        {doctors.length < max && (
          <button type="button" className="text-sm text-primary" onClick={add}>+ Agregar médico</button>
        )}
      </div>
    );
  }

  // Default: fields
  return (
    <div className="space-y-3">
      {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
      {(section.fields || []).map((f) => {
        if (f.showWhen && !f.showWhen(data)) return null;
        return <FieldRenderer key={f.name} field={f} value={data[f.name]} data={data} onChange={onChange} />;
      })}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  data,
  onChange,
}: {
  field: FieldDefinition;
  value: any;
  data: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}) {
  const set = (v: any) => onChange({ [field.name]: v });

  const wrap = (children: React.ReactNode, errorMsg?: string) => (
    <div className="space-y-1.5" key={field.name}>
      <Label className="text-xs font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );

  switch (field.type) {
    case "text":
    case "email":
    case "tel":
      return wrap(
        <Input
          type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
          value={value || ""}
          onChange={(e) => set(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
        />
      );
    case "number":
      return wrap(
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
          placeholder={field.placeholder}
        />
      );
    case "money":
      return wrap(
        <Input
          type="number"
          min="0"
          step="0.01"
          value={value || ""}
          onChange={(e) => set(e.target.value)}
          placeholder="0.00"
        />
      );
    case "date":
      return wrap(<Input type="date" value={value || ""} onChange={(e) => set(e.target.value)} />);
    case "textarea":
      return wrap(
        <Textarea value={value || ""} onChange={(e) => set(e.target.value)} placeholder={field.placeholder} rows={4} />
      );
    case "select":
      return wrap(
        <Select value={value || ""} onValueChange={set}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || "Seleccionar"} /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "radio":
      return wrap(
        <RadioGroup value={value || ""} onValueChange={set} className="flex flex-wrap gap-3">
          {(field.options || []).map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem id={`${field.name}_${o.value}`} value={o.value} />
              <Label htmlFor={`${field.name}_${o.value}`} className="text-sm">{o.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "checkbox":
      return (
        <div className="flex items-start gap-2" key={field.name}>
          <Checkbox checked={!!value} onCheckedChange={(v) => set(!!v)} id={field.name} />
          <Label htmlFor={field.name} className="text-sm font-normal leading-snug">
            {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        </div>
      );
    case "checkbox_group": {
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (val: string) => {
        const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
        set(next);
      };
      return wrap(
        <div className="space-y-2">
          {(field.options || []).map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <Checkbox id={`${field.name}_${o.value}`} checked={arr.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              <Label htmlFor={`${field.name}_${o.value}`} className="text-sm font-normal">{o.label}</Label>
            </div>
          ))}
        </div>
      );
    }
    case "rfc": {
      const upper = (value || "").toString().toUpperCase();
      const err = upper && !isValidRFC(upper) ? "RFC debe tener 13 caracteres válidos" : undefined;
      return wrap(
        <Input
          value={upper}
          onChange={(e) => set(e.target.value.toUpperCase())}
          placeholder="XXXX000000XXX"
          maxLength={13}
        />,
        err
      );
    }
    case "curp": {
      const upper = (value || "").toString().toUpperCase();
      const err = upper && !isValidCURP(upper) ? "CURP debe tener 18 caracteres válidos" : undefined;
      return wrap(
        <Input
          value={upper}
          onChange={(e) => set(e.target.value.toUpperCase())}
          placeholder="XXXX000000XXXXXX00"
          maxLength={18}
        />,
        err
      );
    }
    case "clabe": {
      const v = (value || "").toString().replace(/\D/g, "").slice(0, 18);
      const err = v && !isValidCLABE(v) ? "La CLABE debe tener exactamente 18 dígitos" : undefined;
      return wrap(
        <Input value={v} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 18))} placeholder="18 dígitos" />,
        err
      );
    }
    case "computed_age": {
      const dob = data[field.dobField || "date_of_birth"];
      const age = computeAge(dob);
      return wrap(<Input value={age} disabled placeholder="—" />);
    }
    case "static_text":
      return (
        <div key={field.name} className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
          {field.text}
        </div>
      );
    case "signature":
      return (
        <SignatureCanvas
          key={field.name}
          label={field.label + (field.required ? " *" : "")}
          value={value}
          onChange={set}
        />
      );
    case "image_upload":
      return wrap(
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => set(reader.result as string);
            reader.readAsDataURL(file);
          }}
        />
      );
    default:
      return null;
  }
}
