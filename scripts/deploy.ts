import {
  deployInvestmentPool,
  deploySmartDonation,
  deployTrustedNgoManager,
  populateTrustedNgoManager,
} from "./deployHelper";

import { ethers } from "hardhat";

const useDummyData = process.env.DUMMY_DATA! ?? 0;

async function main() {
  console.log("Deploying TrustedNgoManager...");
  const trustedNGOsManagerContract = await deployTrustedNgoManager();

  console.log("Deploying InvestmentPool...");
  const investmentPoolContract = await deployInvestmentPool();

  console.log("Deploying SmartDonation...");
  const smartDonationContract = await deploySmartDonation(
    trustedNGOsManagerContract,
    investmentPoolContract
  );

  console.log("SmartDonation deployed to:", smartDonationContract.address);
  console.log("InvestmentPool deployed to:", investmentPoolContract.address);
  console.log(
    "TrustedNgoManager deployed to:",
    trustedNGOsManagerContract.address
  );

  const invertibleTokenSymbols =
    await investmentPoolContract.getInvertibleTokenSymbols();
  console.log(
    "Invertible tokens available:",
    invertibleTokenSymbols.map((symbol) =>
      ethers.utils.parseBytes32String(symbol)
    )
  );

  if (useDummyData) {
    console.log("Creating dummy NGOs...");
    await populateTrustedNgoManager(trustedNGOsManagerContract);
    console.log("Done!");
  }
  console.log("Deployment complete!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
