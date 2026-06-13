import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

async function test() {
  try {
    const symbol = "AAPL";
    console.log("Fetching quote summary for:", symbol);
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["defaultKeyStatistics", "financialData", "summaryDetail"]
    });
    console.log("Keys in summary:", Object.keys(summary));
    console.log("DefaultKeyStatistics:", JSON.stringify(summary.defaultKeyStatistics, null, 2));
    console.log("FinancialData:", JSON.stringify(summary.financialData, null, 2));
    console.log("SummaryDetail:", JSON.stringify(summary.summaryDetail, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
