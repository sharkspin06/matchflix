-- Sexual orientation (private, used for matching); people can choose more than one
ALTER TABLE "profiles" ADD COLUMN "sexualOrientation" TEXT[] DEFAULT ARRAY[]::TEXT[];
