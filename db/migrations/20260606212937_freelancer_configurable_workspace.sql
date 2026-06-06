-- Migration: freelancer_configurable_workspace
-- Purpose: Symmetric parallel to shop_configurable_workspace (PR-E). Adds
--   the configurable workspace surface for freelancers per the spec in
--   docs/data-model.md, applying the Configurable Workspace Principle:
--   Servyou provides the building blocks; each freelancer assembles
--   their own profile by filling in only the fields that are true for
--   them. A university-student freelancer leaves "current_workplace"
--   blank; a full-time professional fills it in. A freelancer with no
--   formal certifications has zero rows in freelancer_certifications.
--
-- Scope: 3 new nullable text columns on freelancer_profiles + 3 new
--   child tables (freelancer_tools, freelancer_education,
--   freelancer_certifications), each with RLS policies matching the
--   shop child-table pattern (anyone reads; only the owning freelancer
--   manages, checked via JOIN through freelancer_profiles.profile_id =
--   auth.uid()).
--
-- Design decisions called out:
--   1. preferred_payment_method is free-form text, not enum. Spec says
--      "free-form or future small enum"; freelancers describe their
--      preferences in their own words ("Konnect direct", "virement
--      bancaire BIAT", etc.). Future promotion to enum is a small migration.
--   2. freelancer_tools is a simple name list, not linked to a curated
--      tools lookup. Same as preferred_carriers for shops. Post-launch
--      we can promote popular names to a structured catalog with autocomplete.
--   3. Education year_start/year_end as integers, not dates. Freelancers
--      think in years (2018-2022), not specific dates. Less friction, less data.
--   4. No data loss risk: pure additive. The 2 existing freelancer rows
--      (marketing expert, createur de contenu) get NULL on the new
--      columns; existing fields unchanged.
--
-- RLS pattern (identical to shop child tables from PR-E):
--   - SELECT: TRUE (freelancer profiles are public; their tools/education/
--     certifications are public too — they're part of the trust signal
--     buyers use to vet freelancers)
--   - INSERT/UPDATE/DELETE: only the owning freelancer, checked via
--     EXISTS (SELECT 1 FROM freelancer_profiles WHERE id = freelancer_id
--             AND profile_id = auth.uid())

-- ============================================================
-- Step 1: Add 3 configurable scalar columns to freelancer_profiles
-- ============================================================
ALTER TABLE public.freelancer_profiles
  ADD COLUMN working_hours text NULL,
  ADD COLUMN current_workplace text NULL,
  ADD COLUMN preferred_payment_method text NULL;

COMMENT ON COLUMN public.freelancer_profiles.working_hours IS
  'Free-form availability description (e.g. "Lun-Ven 9h-18h" or "Soirs et week-ends"). Configurable Workspace — each freelancer fills in what is true for them.';

COMMENT ON COLUMN public.freelancer_profiles.current_workplace IS
  'Free-form current workplace if any (e.g. "Junior dev @ TechCo", "Indépendant à plein temps", or leave blank). Configurable Workspace.';

COMMENT ON COLUMN public.freelancer_profiles.preferred_payment_method IS
  'Free-form preferred payment method (e.g. "Konnect", "virement bancaire", "Flouci"). Free-form per spec; future promotion to enum is a small migration if useful.';

-- ============================================================
-- Step 2: Create freelancer_tools child table
-- ============================================================
CREATE TABLE public.freelancer_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(freelancer_id, name)
);

CREATE INDEX freelancer_tools_freelancer_idx ON public.freelancer_tools(freelancer_id);

ALTER TABLE public.freelancer_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view freelancer tools"
  ON public.freelancer_tools FOR SELECT
  USING (true);

CREATE POLICY "Freelancer manages own tools — insert"
  ON public.freelancer_tools FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_tools.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "Freelancer manages own tools — update"
  ON public.freelancer_tools FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_tools.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_tools.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "Freelancer manages own tools — delete"
  ON public.freelancer_tools FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_tools.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

-- ============================================================
-- Step 3: Create freelancer_education child table
-- ============================================================
CREATE TABLE public.freelancer_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text NULL,
  field text NULL,
  year_start integer NULL,
  year_end integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX freelancer_education_freelancer_idx ON public.freelancer_education(freelancer_id);

ALTER TABLE public.freelancer_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view freelancer education"
  ON public.freelancer_education FOR SELECT
  USING (true);

CREATE POLICY "Freelancer manages own education — insert"
  ON public.freelancer_education FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_education.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "Freelancer manages own education — update"
  ON public.freelancer_education FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_education.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_education.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "Freelancer manages own education — delete"
  ON public.freelancer_education FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_education.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

-- ============================================================
-- Step 4: Create freelancer_certifications child table
-- ============================================================
CREATE TABLE public.freelancer_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid NOT NULL REFERENCES public.freelancer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuing_org text NULL,
  year_obtained integer NULL,
  credential_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX freelancer_certifications_freelancer_idx ON public.freelancer_certifications(freelancer_id);

ALTER TABLE public.freelancer_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view freelancer certifications"
  ON public.freelancer_certifications FOR SELECT
  USING (true);

CREATE POLICY "Freelancer manages own certifications — insert"
  ON public.freelancer_certifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_certifications.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "Freelancer manages own certifications — update"
  ON public.freelancer_certifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_certifications.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_certifications.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );

CREATE POLICY "Freelancer manages own certifications — delete"
  ON public.freelancer_certifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_profiles fp
      WHERE fp.id = freelancer_certifications.freelancer_id
        AND fp.profile_id = auth.uid()
    )
  );
