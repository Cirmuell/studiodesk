-- Add 'quotation' to the documents type check constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check CHECK (type IN ('proposal','invoice','contract','receipt','quotation'));
