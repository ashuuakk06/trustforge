-- Flyway already tracks applied migrations in its own schema history table.
DROP TABLE IF EXISTS schema_migrations;
