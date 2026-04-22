import { PatientPersonnelManager } from "@/components/personnel/PatientPersonnelManager";

export default function PatientPersonnelPage() {
  return (
    <div className="max-w-5xl mx-auto py-4">
      <PatientPersonnelManager mode="patient" />
    </div>
  );
}

export function AdminPatientPersonnelPage() {
  return (
    <div className="max-w-6xl mx-auto py-4">
      <PatientPersonnelManager mode="admin" />
    </div>
  );
}