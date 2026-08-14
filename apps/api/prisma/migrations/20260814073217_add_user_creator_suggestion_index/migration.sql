-- CreateIndex
CREATE INDEX "users_is_creator_creator_status_follower_count_idx" ON "users"("is_creator", "creator_status", "follower_count");
