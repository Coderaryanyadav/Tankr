-- ==============================================================================
-- TANKR DATABASE MIGRATION 20: Safe Dev Role Switcher Support
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Allow explicit dev role switch RPC
        IF current_setting('tankr.dev_mode_switch', true) = 'true' THEN
            RETURN NEW;
        END IF;

        -- Check if executing context is service_role or an existing verified admin
        IF auth.role() != 'service_role' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'admin'
            ) THEN
                RAISE EXCEPTION 'Privilege escalation denied: You cannot alter your account role.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_switch_role(p_new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role user_role;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    BEGIN
        v_role := p_new_role::user_role;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid role: %', p_new_role;
    END;

    -- Set local session config for the transaction
    PERFORM set_config('tankr.dev_mode_switch', 'true', true);

    UPDATE public.profiles
    SET role = v_role,
        is_onboarding_completed = TRUE,
        updated_at = NOW()
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'user_id', auth.uid(),
        'new_role', v_role
    );
END;
$$;
