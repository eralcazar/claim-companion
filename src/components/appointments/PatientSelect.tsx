import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";

interface Props {
  value: string | null;
  onChange: (userId: string, fullName: string) => void;
}

export function PatientSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { data: patients, isLoading } = usePatients();
  const selected = patients?.find((p) => p.user_id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-4 w-4 opacity-60 shrink-0" />
            <span className="truncate">
              {selected
                ? selected.full_name
                : isLoading
                ? "Cargando pacientes..."
                : "Buscar paciente..."}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Nombre o email..." />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {(patients ?? []).map((p) => (
                <CommandItem
                  key={p.user_id}
                  value={`${p.full_name} ${p.email}`}
                  onSelect={() => {
                    onChange(p.user_id, p.full_name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.user_id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{p.full_name}</span>
                    {p.email && (
                      <span className="text-xs text-muted-foreground">{p.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}