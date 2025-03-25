-- Använd hockey_training schema
SET search_path TO hockey_training, public;

-- Lägg till calendar_event_id i isträningar
ALTER TABLE ice_sessions
ADD COLUMN calendar_event_id INTEGER;

-- Lägg till calendar_event_id i fysträningar
ALTER TABLE physical_training
ADD COLUMN calendar_event_id INTEGER;

-- Skapa index för att snabbt söka efter träningar med specifik calendar_event_id
CREATE INDEX idx_ice_sessions_calendar_event_id ON ice_sessions(calendar_event_id);
CREATE INDEX idx_physical_training_calendar_event_id ON physical_training(calendar_event_id);

-- Lägg till kommentarer för dokumentation
COMMENT ON COLUMN ice_sessions.calendar_event_id IS 'Referens till eventId i calendar-service';
COMMENT ON COLUMN physical_training.calendar_event_id IS 'Referens till eventId i calendar-service';