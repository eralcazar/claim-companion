// Catálogo semilla de ejercicios reutilizable para el planner y sugerencias IA.
export type ExerciseMeta = {
  name: string;
  muscle_group:
    | "piernas"
    | "gluteos"
    | "core"
    | "espalda"
    | "pecho"
    | "brazos"
    | "hombros"
    | "cardio"
    | "cuerpo_completo"
    | "movilidad";
  equipment: "ninguno" | "mancuernas" | "banda" | "banca" | "barra" | "maquina" | "esterilla";
  level: "principiante" | "intermedio" | "avanzado";
  default_sets?: number;
  default_reps?: number;
  default_duration_seconds?: number;
  default_rest_seconds?: number;
  contraindications?: string[];
};

export const EXERCISE_CATALOG: ExerciseMeta[] = [
  { name: "Sentadilla libre", muscle_group: "piernas", equipment: "ninguno", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 60 },
  { name: "Sentadilla búlgara", muscle_group: "piernas", equipment: "mancuernas", level: "intermedio", default_sets: 3, default_reps: 10, default_rest_seconds: 75 },
  { name: "Zancadas alternadas", muscle_group: "piernas", equipment: "ninguno", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 60 },
  { name: "Peso muerto rumano", muscle_group: "piernas", equipment: "mancuernas", level: "intermedio", default_sets: 4, default_reps: 10, default_rest_seconds: 90 },
  { name: "Puente de glúteo", muscle_group: "gluteos", equipment: "esterilla", level: "principiante", default_sets: 3, default_reps: 15, default_rest_seconds: 45 },
  { name: "Hip thrust", muscle_group: "gluteos", equipment: "banca", level: "intermedio", default_sets: 4, default_reps: 12, default_rest_seconds: 90 },
  { name: "Plancha frontal", muscle_group: "core", equipment: "esterilla", level: "principiante", default_sets: 3, default_duration_seconds: 30, default_rest_seconds: 30 },
  { name: "Plancha lateral", muscle_group: "core", equipment: "esterilla", level: "intermedio", default_sets: 3, default_duration_seconds: 30, default_rest_seconds: 30 },
  { name: "Dead bug", muscle_group: "core", equipment: "esterilla", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 30 },
  { name: "Bird dog", muscle_group: "core", equipment: "esterilla", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 30 },
  { name: "Remo con mancuerna", muscle_group: "espalda", equipment: "mancuernas", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 60 },
  { name: "Superman", muscle_group: "espalda", equipment: "esterilla", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 30 },
  { name: "Face pull con banda", muscle_group: "espalda", equipment: "banda", level: "principiante", default_sets: 3, default_reps: 15, default_rest_seconds: 45 },
  { name: "Flexiones de pecho", muscle_group: "pecho", equipment: "ninguno", level: "principiante", default_sets: 3, default_reps: 10, default_rest_seconds: 60 },
  { name: "Press banca con mancuernas", muscle_group: "pecho", equipment: "mancuernas", level: "intermedio", default_sets: 4, default_reps: 10, default_rest_seconds: 90 },
  { name: "Curl bíceps", muscle_group: "brazos", equipment: "mancuernas", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 45 },
  { name: "Extensión de tríceps", muscle_group: "brazos", equipment: "mancuernas", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 45 },
  { name: "Press militar", muscle_group: "hombros", equipment: "mancuernas", level: "intermedio", default_sets: 3, default_reps: 10, default_rest_seconds: 60 },
  { name: "Elevaciones laterales", muscle_group: "hombros", equipment: "mancuernas", level: "principiante", default_sets: 3, default_reps: 12, default_rest_seconds: 45 },
  { name: "Caminata rápida", muscle_group: "cardio", equipment: "ninguno", level: "principiante", default_duration_seconds: 1800, contraindications: ["dolor articular agudo"] },
  { name: "Trote suave", muscle_group: "cardio", equipment: "ninguno", level: "intermedio", default_duration_seconds: 1200, contraindications: ["lesión de rodilla"] },
  { name: "Bicicleta estática", muscle_group: "cardio", equipment: "maquina", level: "principiante", default_duration_seconds: 1800 },
  { name: "Saltos con cuerda", muscle_group: "cardio", equipment: "ninguno", level: "intermedio", default_sets: 4, default_duration_seconds: 60, default_rest_seconds: 60 },
  { name: "Burpees", muscle_group: "cuerpo_completo", equipment: "ninguno", level: "avanzado", default_sets: 4, default_reps: 10, default_rest_seconds: 60, contraindications: ["HTA no controlada", "lesión de rodilla"] },
  { name: "Mountain climbers", muscle_group: "cuerpo_completo", equipment: "esterilla", level: "intermedio", default_sets: 3, default_duration_seconds: 30, default_rest_seconds: 45 },
  { name: "Jumping jacks", muscle_group: "cardio", equipment: "ninguno", level: "principiante", default_sets: 3, default_duration_seconds: 45, default_rest_seconds: 30 },
  { name: "Estiramiento de isquiotibiales", muscle_group: "movilidad", equipment: "esterilla", level: "principiante", default_sets: 2, default_duration_seconds: 30, default_rest_seconds: 15 },
  { name: "Movilidad de cadera 90/90", muscle_group: "movilidad", equipment: "esterilla", level: "principiante", default_sets: 2, default_reps: 10, default_rest_seconds: 20 },
  { name: "Cat-cow", muscle_group: "movilidad", equipment: "esterilla", level: "principiante", default_sets: 2, default_reps: 12, default_rest_seconds: 15 },
  { name: "Saludo al sol (yoga)", muscle_group: "movilidad", equipment: "esterilla", level: "principiante", default_sets: 3, default_duration_seconds: 60, default_rest_seconds: 30 },
];

export const MUSCLE_GROUP_LABEL: Record<ExerciseMeta["muscle_group"], string> = {
  piernas: "Piernas",
  gluteos: "Glúteos",
  core: "Core",
  espalda: "Espalda",
  pecho: "Pecho",
  brazos: "Brazos",
  hombros: "Hombros",
  cardio: "Cardio",
  cuerpo_completo: "Cuerpo completo",
  movilidad: "Movilidad",
};

export const DAYS_OF_WEEK = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;