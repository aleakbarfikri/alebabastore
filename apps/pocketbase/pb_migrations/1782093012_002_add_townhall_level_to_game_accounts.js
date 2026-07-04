/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("game_accounts");

  const existing = collection.fields.getByName("townhall_level");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("townhall_level"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "townhall_level",
    required: false,
    min: 1,
    max: 14
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("game_accounts");
    collection.fields.removeByName("townhall_level");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})