import { loadTickersList, loadTickerDetail } from "../lib/board";

async function check() {
  console.log("Checking loadTickerDetail for AAON...");
  const detail = await loadTickerDetail("AAON");
  console.log("AAON detail loaded:", !!detail);
  if (detail) {
    console.log("AAON metrics:", detail.metrics);
  }
}

check().catch(console.error);
