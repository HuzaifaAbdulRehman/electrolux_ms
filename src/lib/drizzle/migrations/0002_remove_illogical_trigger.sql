-- Remove the illogical meter reading validation trigger
-- This trigger was preventing legitimate meter readings in professional scenarios:
-- - Meter replacement (new meter starts from 0)
-- - Meter rollover (digital meters reset after 99999)
-- - Seasonal usage variations
-- - Meter repair/recalibration

DROP TRIGGER IF EXISTS `before_meter_reading_insert`;

-- Create a new trigger that only validates non-negative readings
DELIMITER $$

CREATE TRIGGER `before_meter_reading_insert`
BEFORE INSERT ON `meter_readings`
FOR EACH ROW
BEGIN
  -- Only validate that readings are not negative (logical constraint)
  IF NEW.current_reading < 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Reading cannot be negative';
  END IF;

  -- Calculate units consumed (can be negative for meter replacement/rollover)
  SET NEW.units_consumed = NEW.current_reading - NEW.previous_reading;
END$$

DELIMITER ;

