import { syncCatalogFromProvider } from "../api/lib/catalog-sync";

const shouldApply = process.argv.includes("--apply");
const onlyActive = !process.argv.includes("--include-inactive");
const shouldPrune = !process.argv.includes("--no-prune");

async function main() {
  console.log(`Sync provider products (${shouldApply ? "apply" : "dry-run"})...`);
  const result = await syncCatalogFromProvider({
    apply: shouldApply,
    onlyActive,
    prune: shouldPrune,
  });

  console.log(
    `Fetched ${result.totalFetched} services. Keeping ${result.totalRows} services from ${result.uniqueGames} games and ${result.utilityGroups} utility groups.`
  );

  if (!shouldApply) {
    console.log("Dry-run only. Run with --apply to write to database.");
    console.table(result.sample);
    return;
  }

  console.log("Sync complete:");
  console.table({
    gamesCreated: result.gamesCreated,
    productsCreated: result.productsCreated,
    productsUpdated: result.productsUpdated,
    productsDeleted: result.productsDeleted,
    productsDeactivated: result.productsDeactivated,
    gamesDeleted: result.gamesDeleted,
    gamesDeactivated: result.gamesDeactivated,
    totalServices: result.totalRows,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
