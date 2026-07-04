/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("game_accounts");
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  collection.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  collection.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("game_accounts");
  // No previous rules to restore
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})