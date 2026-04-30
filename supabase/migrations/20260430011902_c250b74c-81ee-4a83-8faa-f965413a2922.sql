UPDATE public.ai_token_packs
SET stripe_price_id = codigo, stripe_product_id = codigo, updated_at = now()
WHERE codigo IN ('kari_tokens_mini','kari_tokens_plus','kari_tokens_pro');