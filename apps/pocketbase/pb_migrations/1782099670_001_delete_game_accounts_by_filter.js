/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // First, delete all reviews that reference this game_accounts record
  const dependentReviews = app.findRecordsByFilter("reviews", "gameAccountId='rp33nzflrbk4fm9'");
  for (const review of dependentReviews) {
    app.delete(review);
  }
  
  // Now delete the game_accounts record
  const records = app.findRecordsByFilter("game_accounts", "id='rp33nzflrbk4fm9'");
  for (const record of records) {
    app.delete(record);
  }
}, (app) => {
  // Rollback: record data not stored, manual restore needed
})