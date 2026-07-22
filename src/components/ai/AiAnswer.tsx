import ReactMarkdown from "react-markdown";
import { ExternalLink } from "lucide-react";

export type AiReference = {
  id: string;
  title: string;
  source: string;
  url?: string | null;
  snippet?: string;
  section?: string | null;
};

type Props = {
  text: string;
  references?: AiReference[];
  className?: string;
};

export function AiAnswer({ text, references = [], className }: Props) {
  return (
    <div className={className}>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{text || ""}</ReactMarkdown>
      </div>
      {references.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Referencias ({references.length})
          </p>
          <ol className="space-y-1.5 text-xs">
            {references.map((r, i) => (
              <li key={`${r.id}-${i}`} className="leading-snug">
                <span className="mr-1 font-semibold text-primary">[{i + 1}]</span>
                <span className="font-medium">{r.title}</span>
                <span className="mx-1 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{r.source}</span>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    ver <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10px] italic text-muted-foreground">
            Información educativa. No sustituye la valoración de un profesional de salud.
          </p>
        </div>
      )}
    </div>
  );
}

export default AiAnswer;