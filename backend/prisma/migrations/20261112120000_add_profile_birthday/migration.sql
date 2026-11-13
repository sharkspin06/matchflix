-- Store the date of birth so age can only change through it, and stays current
ALTER TABLE "profiles" ADD COLUMN "birthday" DATE;
