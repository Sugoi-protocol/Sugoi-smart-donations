import {
  deployInvestmentPool,
  deploySmartDonation,
  deployTrustedNgoManager,
  populateTrustedNgoManager,
} from "./deployHelper";

import { ethers } from "hardhat";

async function main() {
  const hre = require("hardhat");

  console.log("Deploying contracts...");
  const smartDonationContract = await deployContracts();

  const [signer] = await ethers.getSigners();
  const address = signer.address;
  const contract = smartDonationContract.address;
  await hre.run("simulation", { contract, address });
}

async function deployContracts() {
  const trustedNGOsManagerContract = await deployTrustedNgoManager();

  const investmentPoolContract = await deployInvestmentPool();

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

  console.log("Creating dummy NGOs...");
  await populateTrustedNgoManager(trustedNGOsManagerContract);

  console.log("Deployment complete!");

  return smartDonationContract;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
