// GPX 1.1 builder — minimal, browser-safe (no XML libs).
export type GpxPoint = {
  latitude: number;
  longitude: number;
  altitude_m?: number | null;
  captured_at?: string | null;
};

export type GpxRouteMeta = {
  id: string;
  activity_type?: string | null;
  started_at?: string | null;
};

function xmlEscape(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  }[c] as string));
}

export function buildGpx(route: GpxRouteMeta, points: GpxPoint[]): string {
  const name = xmlEscape(
    `CareCentral ${route.activity_type ?? "recorrido"} ${
      route.started_at ? new Date(route.started_at).toISOString() : ""
    }`.trim(),
  );
  const time = route.started_at
    ? new Date(route.started_at).toISOString()
    : new Date().toISOString();
  const trkpts = points
    .map((p) => {
      const ele = p.altitude_m != null ? `<ele>${p.altitude_m}</ele>` : "";
      const t = p.captured_at ? `<time>${new Date(p.captured_at).toISOString()}</time>` : "";
      return `      <trkpt lat="${p.latitude}" lon="${p.longitude}">${ele}${t}</trkpt>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CareCentral" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadFile(filename: string, contents: string | Blob, mime = "application/gpx+xml") {
  const blob = contents instanceof Blob ? contents : new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}