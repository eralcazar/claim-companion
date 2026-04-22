import { supabase } from "@/integrations/supabase/client";
import {
  generateFilledPDF,
  buildOverlayData,
} from "@/lib/generateFilledPDF";
import {
  checkFormatExists,
  getFormKey,
} from "@/components/claims/forms/registry";
import type { FormCoordinatesKey } from "@/lib/formCoordinates";
import {
  findFormularioByInsurerAndTramite,
  generateFilledPDFDynamic,
} from "@/lib/generateFilledPDFDynamic";

export interface PipelineInput {
  userId: string;
  insurer: string;
  formatId: string;
  policyId: string;
  formCode: string;
  data: Record<string, any>;
  profile: any;
  policy: any;
  existingDraftId?: string | null;
  /** ID de la firma elegida en `firmas_usuario` (opcional) */
  firmaId?: string | null;
}

export interface PipelineResult {
  folio: string;
  pdfPath: string;
  pdfBytes: Uint8Array;
  draftId: string;
}

/**
 * Pipeline unificado para generar el PDF oficial llenado:
 *   1) valida que el PDF original exista en Storage
 *   2) construye overlay y rellena el PDF
 *   3) sube a `documents/`
 *   4) genera folio (RPC gen_folio)
 *   5) actualiza/crea registro en `claim_forms` con status="submitted"
 *
 * Si algo falla, marca el draft con status="error" y guarda `error_message`.
 */
export async function runClaimPipeline(input: PipelineInput): Promise<PipelineResult> {
  const {
    userId, insurer, formatId, policyId, formCode,
    data, profile, policy, existingDraftId, firmaId,
  } = input;

  const insurerNorm = (insurer || "").toUpperCase();
  let draftId = existingDraftId || null;

  // Helper local para marcar error
  const markError = async (msg: string) => {
    if (!draftId) return;
    await supabase
      .from("claim_forms")
      .update({ status: "error", error_message: msg })
      .eq("id", draftId);
  };

  try {
    // 1) Validar Storage
    const exists = await checkFormatExists(insurerNorm, formatId);
    if (!exists) {
      const msg = `El formato oficial de ${insurerNorm} aún no está disponible en Storage.`;
      await markError(msg);
      throw new Error(msg);
    }

    // 2) Generar PDF: si hay un `formulario` en BD configurado, usar el path
    //    dinámico (campos + opciones + firma). Si no, fallback al legacy.
    let pdfBytes: Uint8Array;

    const dyn = await findFormularioByInsurerAndTramite(insurerNorm, formatId);
    if (dyn.formulario && dyn.campos.length > 0) {
      // Resolver firma seleccionada (si hay)
      let firmaDataUrl: string | null = null;
      if (firmaId) {
        const { data: f } = await supabase
          .from("firmas_usuario" as any)
          .select("imagen_base64")
          .eq("id", firmaId)
          .maybeSingle();
        firmaDataUrl = (f as any)?.imagen_base64 || null;
      }
      pdfBytes = await generateFilledPDFDynamic({
        formularioStoragePath: dyn.formulario.storage_path,
        campos: dyn.campos,
        data,
        firmaDataUrl,
      });
    } else {
      const formKey = getFormKey(insurerNorm, formatId) as FormCoordinatesKey | null;
      if (!formKey) {
        const msg = `No hay coordenadas configuradas para ${insurerNorm} / ${formatId}.`;
        await markError(msg);
        throw new Error(msg);
      }
      const overlay = buildOverlayData({
        data, profile, policy, insurer: insurerNorm, tramite: formatId,
      });
      pdfBytes = await generateFilledPDF(formKey, overlay);
    }

    // 3) Folio
    const { data: folioRes, error: folioErr } = await supabase.rpc("gen_folio", {
      _insurer: insurerNorm,
      _code: formCode,
    });
    if (folioErr) throw folioErr;
    const folio = folioRes as string;

    // 4) Upload
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const path = `claim-forms/${userId}/${folio}.pdf`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    // 5) Persist
    const payload = {
      user_id: userId,
      policy_id: policyId,
      insurer: insurerNorm,
      form_code: formCode,
      tramite_type: formatId,
      data: data as any,
      status: "submitted" as const,
      folio,
      pdf_path: path,
      error_message: null,
    };
    if (draftId) {
      const { error } = await supabase.from("claim_forms").update(payload).eq("id", draftId);
      if (error) throw error;
    } else {
      const { data: ins, error } = await supabase
        .from("claim_forms")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      draftId = ins.id;
    }

    return { folio, pdfPath: path, pdfBytes, draftId: draftId! };
  } catch (e: any) {
    const msg = e?.message || "Error desconocido en el pipeline";
    await markError(msg);
    throw e;
  }
}