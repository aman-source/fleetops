-- Vehicle status transition trigger
CREATE OR REPLACE FUNCTION validate_vehicle_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Same status update is always allowed (no-op updates)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'available'          AND NEW.status IN ('conditional','under_maintenance','no_go','expired_documents','ivms_fault','nfc_fault','hse_hold','decommissioned'))
    OR (OLD.status = 'conditional'     AND NEW.status IN ('available','under_maintenance','no_go','expired_documents','ivms_fault','nfc_fault','hse_hold','decommissioned'))
    OR (OLD.status = 'under_maintenance' AND NEW.status IN ('available','conditional','no_go','decommissioned'))
    OR (OLD.status = 'no_go'           AND NEW.status IN ('available','conditional','under_maintenance','decommissioned'))
    OR (OLD.status = 'expired_documents' AND NEW.status IN ('available','conditional','under_maintenance','decommissioned'))
    OR (OLD.status = 'ivms_fault'      AND NEW.status IN ('available','conditional','under_maintenance','decommissioned'))
    OR (OLD.status = 'nfc_fault'       AND NEW.status IN ('available','conditional','under_maintenance','decommissioned'))
    OR (OLD.status = 'hse_hold'        AND NEW.status IN ('available','conditional','under_maintenance','no_go','decommissioned'))
    OR (OLD.status = 'decommissioned'  AND FALSE)
  ) THEN
    RAISE EXCEPTION 'Invalid vehicle status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation', HINT = 'See VEHICLE_STATUS_TRANSITIONS in vehicles.ts';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_vehicle_status_transition ON vehicles;
--> statement-breakpoint
CREATE TRIGGER trg_vehicle_status_transition
  BEFORE UPDATE OF status ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION validate_vehicle_status_transition();
--> statement-breakpoint
-- Journey status transition trigger
CREATE OR REPLACE FUNCTION validate_journey_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft'            AND NEW.status IN ('pending_approval','cancelled'))
    OR (OLD.status = 'pending_approval' AND NEW.status IN ('approved','rejected','cancelled'))
    OR (OLD.status = 'approved'      AND NEW.status IN ('active','cancelled'))
    OR (OLD.status = 'active'        AND NEW.status IN ('delayed','deviated','completed','closed','closed_with_exceptions','emergency','cancelled'))
    OR (OLD.status = 'delayed'       AND NEW.status IN ('active','deviated','completed','closed','closed_with_exceptions','cancelled'))
    OR (OLD.status = 'deviated'      AND NEW.status IN ('active','delayed','completed','closed','closed_with_exceptions','cancelled'))
    OR (OLD.status = 'emergency'     AND NEW.status IN ('active','completed','closed','closed_with_exceptions','cancelled'))
    OR (OLD.status = 'completed'     AND NEW.status IN ('closed','closed_with_exceptions'))
    OR (OLD.status = 'closed'        AND FALSE)
    OR (OLD.status = 'rejected'      AND FALSE)
    OR (OLD.status = 'cancelled'     AND FALSE)
  ) THEN
    RAISE EXCEPTION 'Invalid journey status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation', HINT = 'See JOURNEY_STATUSES in journeys.ts';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_journey_status_transition ON journeys;
--> statement-breakpoint
CREATE TRIGGER trg_journey_status_transition
  BEFORE UPDATE OF status ON journeys
  FOR EACH ROW
  EXECUTE FUNCTION validate_journey_status_transition();
