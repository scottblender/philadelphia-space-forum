-- Remove private management links in the same transaction as the attendee record.
CREATE TRIGGER delete_registration_tokens
BEFORE DELETE ON registrations
BEGIN
  DELETE FROM management_tokens WHERE registration_id = OLD.id;
END;
