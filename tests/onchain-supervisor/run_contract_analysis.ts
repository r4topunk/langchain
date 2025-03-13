import { analyzeContractWithStream } from "./contract_analysis_supervisor";

// Get contract address from command line arguments
const contractAddress = process.argv[2];

console.log("Contract Analysis Tool");
console.log("=====================\n");

// Validate that we have a contract address
if (!contractAddress) {
  console.error("Error: Please provide a contract address");
  console.log("Usage: npm run analyze-contract [ethereum-address]");
  console.log(
    "Example: npm run analyze-contract 0x1234567890123456789012345678901234567890"
  );
  process.exit(1);
}

// Run the analysis with a timeout of 5 minutes
analyzeContractWithStream(contractAddress, 5 * 60 * 1000)
  .then(() => {
    console.log("\nAnalysis complete");
  })
  .catch((error) => {
    console.error("Error during analysis:", error.message);
    process.exit(1);
  });
