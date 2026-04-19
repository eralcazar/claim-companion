CREATE POLICY "Users can delete own claims"
ON public.claims
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own claim docs"
ON public.claim_documents
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.user_id = auth.uid()));