-- Each car record carries its own display emoji; existing rows keep the old fixed car.
ALTER TABLE cars ADD COLUMN emoji VARCHAR(16) NOT NULL DEFAULT '🚗';
