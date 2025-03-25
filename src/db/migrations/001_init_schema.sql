-- Skapa schema för hockey_training om det inte redan finns
CREATE SCHEMA IF NOT EXISTS hockey_training;

-- Använd hockey_training schema
SET search_path TO hockey_training, public;

-- Skapa tabell för övningar
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ice', 'dryland')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  focus_area VARCHAR(50),
  instructions TEXT,
  image_url VARCHAR(255),
  video_url VARCHAR(255),
  equipment TEXT,
  keywords TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  updated_at TIMESTAMP
);

-- Skapa tabell för isträningar
CREATE TABLE IF NOT EXISTS ice_sessions (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('technique', 'tactical', 'game', 'conditioning', 'mixed')),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id INTEGER,
  coach_notes TEXT,
  player_notes TEXT,
  goals TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  updated_at TIMESTAMP
);

-- Skapa tabell för isträningsövningar
CREATE TABLE IF NOT EXISTS ice_session_exercises (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES ice_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL,
  description TEXT,
  coaching_points TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skapa tabell för fysiska träningar
CREATE TABLE IF NOT EXISTS physical_training (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  training_type VARCHAR(50) NOT NULL CHECK (training_type IN ('strength', 'cardio', 'agility', 'recovery', 'flexibility', 'balance')),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id INTEGER,
  coach_notes TEXT,
  player_notes TEXT,
  goals TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  updated_at TIMESTAMP
);

-- Skapa tabell för fysträningsövningar
CREATE TABLE IF NOT EXISTS physical_training_exercises (
  id SERIAL PRIMARY KEY,
  training_id INTEGER NOT NULL REFERENCES physical_training(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  sets INTEGER,
  reps INTEGER,
  weight VARCHAR(20),
  rest_time VARCHAR(20),
  order_index INTEGER NOT NULL,
  description TEXT,
  coaching_points TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skapa tabell för testresultat
CREATE TABLE IF NOT EXISTS test_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  test_date DATE NOT NULL,
  result NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  notes TEXT,
  comparison_to_previous NUMERIC(10, 2),
  test_conditions TEXT,
  test_location VARCHAR(100),
  administered_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Skapa index
CREATE INDEX idx_ice_sessions_team_id ON ice_sessions(team_id);
CREATE INDEX idx_ice_sessions_date ON ice_sessions(session_date);
CREATE INDEX idx_physical_training_team_id ON physical_training(team_id);
CREATE INDEX idx_physical_training_date ON physical_training(session_date);
CREATE INDEX idx_test_results_user_id ON test_results(user_id);
CREATE INDEX idx_test_results_team_id ON test_results(team_id);
CREATE INDEX idx_test_results_type_date ON test_results(test_type, test_date);