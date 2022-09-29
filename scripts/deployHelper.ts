import { InvestmentPool, TrustedNGOsManager } from "../typechain";

import { ethers } from "hardhat";

export const invertibleTokens = [
  {
    symbol: ethers.utils.formatBytes32String("DAI"),
    tokenAddress: process.env.DAI_CONTRACT_ADDRESS!,
    cTokenAddress: process.env.COMPOUND_DAI_CONTRACT_ADDRESS!,
  },
  {
    symbol: ethers.utils.formatBytes32String("USDC"),
    tokenAddress: process.env.USDC_CONTRACT_ADDRESS!,
    cTokenAddress: process.env.COMPOUND_USDC_CONTRACT_ADDRESS!,
  },
  {
    symbol: ethers.utils.formatBytes32String("USDT"),
    tokenAddress: process.env.USDT_CONTRACT_ADDRESS!,
    cTokenAddress: process.env.COMPOUND_USDT_CONTRACT_ADDRESS!,
  },
];

export async function deployTrustedNgoManager() {
  const TrustedNGOsManager = await ethers.getContractFactory(
    "TrustedNGOsManager"
  );
  const trustedNGOsManagerContract = await TrustedNGOsManager.deploy();
  await trustedNGOsManagerContract.deployed();
  return trustedNGOsManagerContract;
}

export async function deployInvestmentPool() {
  const InvestmentPool = await ethers.getContractFactory("InvestmentPool");
  const investmentPoolContract = await InvestmentPool.deploy(invertibleTokens);
  await investmentPoolContract.deployed();
  return investmentPoolContract;
}

export async function deploySmartDonation(
  trustedNGOsManagerContract: TrustedNGOsManager,
  investmentPoolContract: InvestmentPool
) {
  const SmartDonation = await ethers.getContractFactory("SmartDonation");
  const smartDonationContract = await SmartDonation.deploy(
    trustedNGOsManagerContract.address,
    investmentPoolContract.address
  );
  await smartDonationContract.deployed();
  investmentPoolContract.transferOwnership(smartDonationContract.address);
  return smartDonationContract;
}

export async function populateTrustedNgoManager(
  trustedNGOsManagerContract: TrustedNGOsManager
) {
  const accounts = await ethers.getSigners();
  await trustedNGOsManagerContract.addNgo(
    ethers.utils.formatBytes32String("Ngo 1"),
    accounts[1].address
  );
  await trustedNGOsManagerContract.addNgo(
    ethers.utils.formatBytes32String("Ngo 2"),
    accounts[2].address
  );
  await trustedNGOsManagerContract.addNgo(
    ethers.utils.formatBytes32String("Ngo 3"),
    accounts[3].address
  );
  await trustedNGOsManagerContract.addNgo(
    ethers.utils.formatBytes32String("Ngo 4"),
    accounts[4].address
  );
}
