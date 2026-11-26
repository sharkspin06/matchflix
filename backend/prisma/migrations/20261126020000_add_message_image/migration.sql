-- Photos in chat: a message can carry an uploaded image (its text may then be empty)
ALTER TABLE "messages" ADD COLUMN "imageUrl" TEXT;
