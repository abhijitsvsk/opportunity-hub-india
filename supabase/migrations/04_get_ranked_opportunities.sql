CREATE OR REPLACE FUNCTION public.get_ranked_opportunities(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    title text,
    type text,
    description text,
    source_url text,
    deadline timestamptz,
    deadline_confidence text,
    domain_tags text[],
    eligibility jsonb,
    effort_level text,
    competitiveness text,
    is_active boolean,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile public.user_profiles;
    v_user_year_num int := NULL;
BEGIN
    -- ISSUE 1: Prevent unauthorized parameter tampering
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: p_user_id must match authenticated user';
    END IF;

    -- Fetch the user profile
    SELECT * INTO v_profile FROM public.user_profiles WHERE user_id = p_user_id;
    
    -- ISSUE 4: Explicit check for missing profile
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profile not found for user %', p_user_id;
    END IF;

    -- Parse the user's current year into an integer for the JSONB eligibility check
    IF v_profile.current_year = '1st Year' THEN v_user_year_num := 1;
    ELSIF v_profile.current_year = '2nd Year' THEN v_user_year_num := 2;
    ELSIF v_profile.current_year = '3rd Year' THEN v_user_year_num := 3;
    ELSIF v_profile.current_year = '4th Year' THEN v_user_year_num := 4;
    ELSIF v_profile.current_year = 'Postgraduate' THEN v_user_year_num := 5;
    END IF;

    RETURN QUERY
    -- ISSUE 2: Use CTE to pre-compute relevance_score and avoid correlated subqueries in ORDER BY
    WITH scored_opportunities AS (
        SELECT o.id, o.title, o.type, o.description, o.source_url, o.deadline, 
               o.deadline_confidence, o.domain_tags, o.eligibility, o.effort_level, 
               o.competitiveness, o.is_active, o.created_at,
          (
              -- ISSUE 6: Exact matches instead of leading wildcards for Tech Stack
              (
                  SELECT COALESCE(SUM(10), 0)
                  FROM unnest(v_profile.tech_stack) AS ts
                  WHERE EXISTS (
                      SELECT 1 FROM unnest(o.domain_tags) AS dt
                      WHERE lower(dt) = lower(ts)
                  )
              )
              +
              -- Experience level matches (mapped to exact onboarding strings)
              CASE 
                  WHEN v_profile.experience_level = 'None / Fresher' THEN
                      CASE WHEN o.title ILIKE '%fresher%' OR o.title ILIKE '%entry level%' OR o.title ILIKE '%new grad%' THEN 5
                           WHEN o.title ILIKE '%senior%' OR o.title ILIKE '%lead%' THEN -10
                           ELSE 0 END
                  WHEN v_profile.experience_level = '1 prior internship' THEN
                      CASE WHEN (o.description ILIKE '%experience%' OR o.title ILIKE '%intern%') THEN 5 ELSE 0 END
                  WHEN v_profile.experience_level = '2+ internships' THEN
                      CASE WHEN (o.description ILIKE '%proven%' OR o.description ILIKE '%advanced%' OR o.competitiveness = 'high') THEN 5 ELSE 0 END
                  ELSE 0
              END
              +
              -- College tier match
              CASE 
                  WHEN (v_profile.college_tier = 'IIT/IISc' OR v_profile.college_tier = 'NIT/IIIT/BITS') AND o.competitiveness = 'high' THEN 5
                  ELSE 0
              END
              +
              -- ISSUE 5: Exact string matching for Focus Area enums
              CASE 
                  WHEN v_profile.focus_area ILIKE '%Looking for Internships%' AND o.type = 'internship' THEN 15
                  WHEN v_profile.focus_area ILIKE '%Looking for Hackathons%' AND o.type = 'hackathon' THEN 15
                  WHEN v_profile.focus_area ILIKE '%Looking for Open Source PRs%' AND o.type = 'open-source program' THEN 15
                  WHEN v_profile.focus_area ILIKE '%Looking for Full-Time Roles%' AND o.type = 'full-time' THEN 15
                  ELSE 0
              END
              +
              -- Deadline proximity
              CASE 
                  WHEN o.deadline IS NOT NULL AND EXTRACT(EPOCH FROM (o.deadline - CURRENT_TIMESTAMP)) / 86400 BETWEEN 0 AND 7 THEN 10
                  WHEN o.deadline IS NOT NULL AND EXTRACT(EPOCH FROM (o.deadline - CURRENT_TIMESTAMP)) / 86400 BETWEEN 8 AND 30 THEN 3
                  ELSE 0
              END
          ) AS relevance_score
        FROM public.opportunities o
        WHERE o.is_active = true
          -- ISSUE 3: Permanently filter out past deadline opportunities
          AND (o.deadline IS NULL OR o.deadline > CURRENT_TIMESTAMP)
          -- Eligibility Hard Gate
          AND (
              v_user_year_num IS NULL 
              OR o.eligibility->'year' IS NULL 
              OR jsonb_array_length(CASE WHEN jsonb_typeof(o.eligibility->'year') = 'array' THEN o.eligibility->'year' ELSE '[]'::jsonb END) = 0
              OR (o.eligibility->'year') @> to_jsonb(v_user_year_num)
          )
    )
    SELECT so.id, so.title, so.type, so.description, so.source_url, so.deadline, 
           so.deadline_confidence, so.domain_tags, so.eligibility, so.effort_level, 
           so.competitiveness, so.is_active, so.created_at
    FROM scored_opportunities so
    ORDER BY 
        -- 1. Push null deadlines to the bottom (Matches JS sort behavior)
        CASE WHEN so.deadline IS NULL THEN 1 ELSE 0 END ASC,
        -- 2. Relevance Score (DESC)
        so.relevance_score DESC;
END;
$$;
