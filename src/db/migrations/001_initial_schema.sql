-- Skapa scheman
CREATE SCHEMA IF NOT EXISTS hockey_training;

-- Sätt sökväg
SET search_path TO hockey_training, public;

-- Test typer enum
CREATE TYPE hockey_training.test_type AS ENUM (
  'strength',   -- Styrka
  'speed',      -- Hastighet
  'endurance',  -- Uthållighet
  'agility',    -- Rörlighet
  'technique',  -- Teknik
  'power',      -- Explosivitet
  'reaction',   -- Reaktionsförmåga
  'coordination' -- Koordination
);

-- Test enheter enum
CREATE TYPE hockey_training.test_unit AS ENUM (
  'kg',         -- Kilogram
  'reps',       -- Repetitioner
  'sec',        -- Sekunder
  'min',        -- Minuter
  'cm',         -- Centimeter
  'm',          -- Meter
  'km/h',       -- Kilometer per timme
  'score',      -- Poäng
  'percent'     -- Procent
);

-- Övnings kategorier enum
CREATE TYPE hockey_training.exercise_category AS ENUM (
  'strength',     -- Styrka
  'cardio',       -- Kondition
  'mobility',     -- Rörlighet
  'skill',        -- Färdighet
  'recovery',     -- Återhämtning
  'warmup',       -- Uppvärmning
  'cooldown',     -- Nedvarvning
  'specialized'   -- Specialiserad
);

-- Övningsdefinitioner
CREATE TABLE IF NOT EXISTS hockey_training.exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category exercise_category NOT NULL,
  equipment TEXT[],
  muscle_groups TEXT[],
  instructions TEXT,
  video_url VARCHAR(255),
  image_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER,  -- Referens till användare som lade till övningen
  is_active BOOLEAN DEFAULT TRUE
);

-- Tester
CREATE TABLE IF NOT EXISTS hockey_training.tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  test_type test_type NOT NULL,
  unit test_unit NOT NULL,
  instructions TEXT,
  equipment TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER,  -- Referens till användare som skapade testet
  is_active BOOLEAN DEFAULT TRUE
);

-- Testresultat
CREATE TABLE IF NOT EXISTS hockey_training.test_results (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES hockey_training.tests(id),
  user_id INTEGER NOT NULL,  -- Referens till användare som gjorde testet
  team_id INTEGER,           -- Referens till laget användaren tillhör
  test_date DATE NOT NULL,
  result NUMERIC(10, 2) NOT NULL,
  unit test_unit NOT NULL,
  test_type test_type NOT NULL,
  notes TEXT,
  comparison_to_previous NUMERIC(6, 2),  -- Procentuell förändring jämfört med föregående test
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER,        -- Referens till användare (tränare) som registrerade resultatet
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by INTEGER         -- Referens till användare som senast uppdaterade resultatet
);

-- Träningsprogram
CREATE TABLE IF NOT EXISTS hockey_training.programs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  team_id INTEGER,            -- Null om programmet är för en enskild spelare
  is_team_program BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER NOT NULL, -- Referens till tränare som skapade programmet
  is_active BOOLEAN DEFAULT TRUE
);

-- Tilldelningar av användare till träningsprogram
CREATE TABLE IF NOT EXISTS hockey_training.program_assignments (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES hockey_training.programs(id),
  user_id INTEGER NOT NULL,   -- Referens till spelare som tilldelats programmet
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by INTEGER NOT NULL, -- Referens till tränare som tilldelade programmet
  is_active BOOLEAN DEFAULT TRUE,
  completion_status NUMERIC(5, 2) DEFAULT 0 -- Procent färdigställt (0-100)
);

-- Träningspass i ett program
CREATE TABLE IF NOT EXISTS hockey_training.workouts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES hockey_training.programs(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  day_number INTEGER NOT NULL, -- Dag i programmet (1, 2, 3 etc)
  estimated_duration INTEGER,  -- Uppskattad tid i minuter
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER NOT NULL, -- Referens till tränare som skapade träningspasset
  instructions TEXT
);

-- Övningar i ett träningspass
CREATE TABLE IF NOT EXISTS hockey_training.workout_exercises (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES hockey_training.workouts(id),
  exercise_id INTEGER NOT NULL REFERENCES hockey_training.exercises(id),
  sets INTEGER,  -- Antal set
  reps VARCHAR(50),  -- Kan vara t.ex. "10-12" eller "max"
  rest_time INTEGER,  -- Vila mellan set i sekunder
  order_number INTEGER NOT NULL, -- Ordning i träningspasset
  instructions TEXT,  -- Specifika instruktioner för denna övning i detta pass
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  load_instruction VARCHAR(100) -- T.ex. "70% av 1RM" eller "Kroppsvikt"
);

-- Användarprogram (anteckningar/feedback från användare)
CREATE TABLE IF NOT EXISTS hockey_training.user_program_logs (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES hockey_training.program_assignments(id),
  workout_id INTEGER NOT NULL REFERENCES hockey_training.workouts(id),
  completed_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INTEGER,  -- Faktisk tid det tog att slutföra
  perceived_exertion INTEGER CHECK (perceived_exertion BETWEEN 1 AND 10), -- RPE skala 1-10
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individuella övningsloggar för användare
CREATE TABLE IF NOT EXISTS hockey_training.user_exercise_logs (
  id SERIAL PRIMARY KEY,
  log_id INTEGER NOT NULL REFERENCES hockey_training.user_program_logs(id),
  workout_exercise_id INTEGER NOT NULL REFERENCES hockey_training.workout_exercises(id),
  completed_sets INTEGER,  -- Faktiskt antal genomförda set
  completed_reps TEXT,  -- T.ex. "10, 10, 8" för tre set
  weight_used TEXT,  -- T.ex. "80, 80, 75" för vikter i kg
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mallar för träningsprogram
CREATE TABLE IF NOT EXISTS hockey_training.program_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),  -- T.ex. "Off-season", "Pre-season", "In-season", "Recovery"
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  age_group VARCHAR(50),  -- T.ex. "U16", "U18", "Senior"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER NOT NULL,  -- Referens till tränare som skapade mallen
  is_active BOOLEAN DEFAULT TRUE
);

-- Inställningar för användares testmål
CREATE TABLE IF NOT EXISTS hockey_training.user_test_targets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,  -- Referens till användarens ID
  test_id INTEGER NOT NULL REFERENCES hockey_training.tests(id),
  target_value NUMERIC(10, 2) NOT NULL,  -- Målvärde för testet
  set_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- När målet sattes
  target_date DATE,  -- Måldatum för att uppnå målet
  created_by INTEGER,  -- Tränare som satte målet (om satt av tränare)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_achieved BOOLEAN DEFAULT FALSE,  -- Om målet har uppnåtts
  achieved_date DATE  -- När målet uppnåddes, om det har uppnåtts
);

-- Skapa index för bättre prestanda
CREATE INDEX idx_test_results_user_id ON hockey_training.test_results(user_id);
CREATE INDEX idx_test_results_team_id ON hockey_training.test_results(team_id);
CREATE INDEX idx_test_results_test_id ON hockey_training.test_results(test_id);
CREATE INDEX idx_test_results_test_date ON hockey_training.test_results(test_date);

CREATE INDEX idx_programs_team_id ON hockey_training.programs(team_id);
CREATE INDEX idx_programs_created_by ON hockey_training.programs(created_by);

CREATE INDEX idx_program_assignments_program_id ON hockey_training.program_assignments(program_id);
CREATE INDEX idx_program_assignments_user_id ON hockey_training.program_assignments(user_id);

CREATE INDEX idx_workouts_program_id ON hockey_training.workouts(program_id);

CREATE INDEX idx_workout_exercises_workout_id ON hockey_training.workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON hockey_training.workout_exercises(exercise_id);

CREATE INDEX idx_user_program_logs_assignment_id ON hockey_training.user_program_logs(assignment_id);
CREATE INDEX idx_user_program_logs_workout_id ON hockey_training.user_program_logs(workout_id);

CREATE INDEX idx_user_exercise_logs_log_id ON hockey_training.user_exercise_logs(log_id);
CREATE INDEX idx_user_exercise_logs_workout_exercise_id ON hockey_training.user_exercise_logs(workout_exercise_id);

CREATE INDEX idx_user_test_targets_user_id ON hockey_training.user_test_targets(user_id);
CREATE INDEX idx_user_test_targets_test_id ON hockey_training.user_test_targets(test_id);