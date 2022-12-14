import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { CERC20, IERC20, SmartDonation } from "../typechain";
import {
  cTokenToToken,
  parseDaiUnits,
  parseUsdcUnits,
  parseUsdtUnits,
  seedDAI,
  seedUSDC,
  seedUSDT,
} from "./utils/ERC20Utils";

describe("Smart Donation", function () {
  const daiAsBytes32 = ethers.utils.formatBytes32String("DAI");
  const usdcAsBytes32 = ethers.utils.formatBytes32String("USDC");
  const usdtAsBytes32 = ethers.utils.formatBytes32String("USDT");
  const oneThousandDais = parseDaiUnits(1000);
  const oneHundredThousandDais = parseDaiUnits(100000);
  const oneHundredThousandUsdcs = parseUsdcUnits(100000);
  const oneHundredThousandUsdts = parseUsdtUnits(100000);

  const tokenSymbolsAsBytes32 = [daiAsBytes32, usdcAsBytes32, usdtAsBytes32];

  let smartDonationContract: SmartDonation;
  let cDaiContract: CERC20;
  let daiContract: IERC20;
  let cUsdcContract: CERC20;
  let usdcContract: IERC20;
  let cUsdtContract: CERC20;
  let usdtContract: IERC20;
  let donor1: SignerWithAddress;
  let donor2: SignerWithAddress;
  let trustedNgo1: SignerWithAddress;
  let trustedNgo2: SignerWithAddress;
  let trustedNgo3: SignerWithAddress;
  let trustedNgo4: SignerWithAddress;
  let trustedNGOs: SignerWithAddress[];
  let untrustedNgo: SignerWithAddress;
  let owner: SignerWithAddress;
  let accounts: SignerWithAddress[];

  before(async () => {
    cDaiContract = await ethers.getContractAt(
      "CERC20",
      process.env.COMPOUND_DAI_CONTRACT_ADDRESS!
    );
    daiContract = await ethers.getContractAt(
      "IERC20",
      process.env.DAI_CONTRACT_ADDRESS!
    );
    cUsdcContract = await ethers.getContractAt(
      "CERC20",
      process.env.COMPOUND_USDC_CONTRACT_ADDRESS!
    );
    usdcContract = await ethers.getContractAt(
      "IERC20",
      process.env.USDC_CONTRACT_ADDRESS!
    );
    cUsdtContract = await ethers.getContractAt(
      "CERC20",
      process.env.COMPOUND_USDT_CONTRACT_ADDRESS!
    );
    usdtContract = await ethers.getContractAt(
      "IERC20",
      process.env.USDT_CONTRACT_ADDRESS!
    );
    accounts = await ethers.getSigners();
    donor1 = accounts[0];
    donor2 = accounts[1];
    trustedNgo1 = accounts[10];
    trustedNgo2 = accounts[11];
    trustedNgo3 = accounts[12];
    trustedNgo4 = accounts[13];
    trustedNGOs = [
      trustedNgo1,
      trustedNgo2,
      trustedNgo3,
      trustedNgo4,
    ];
    untrustedNgo = accounts[18];
    owner = accounts[19];
  });

  beforeEach(async function () {
    const trustedNGOsManagerContract = await deployTrustedNgoManager();
    const investmentPoolContract = await deployInvestmentPool();

    const SmartDonation = await ethers.getContractFactory("SmartDonation");
    const ownerSmartDonationContract = await SmartDonation.connect(
      owner
    ).deploy(
      trustedNGOsManagerContract.address,
      investmentPoolContract.address
    );
    await ownerSmartDonationContract.deployed();
    investmentPoolContract.transferOwnership(
      ownerSmartDonationContract.address
    );
    smartDonationContract = ownerSmartDonationContract.connect(donor1);
    await seedDAI(donor1.address, oneHundredThousandDais);
    await seedUSDC(donor1.address, oneHundredThousandUsdcs);
    await seedUSDT(donor1.address, oneHundredThousandUsdts);
    await seedDAI(donor2.address, oneHundredThousandDais);
    await seedUSDC(donor2.address, oneHundredThousandUsdcs);
    await seedUSDT(donor2.address, oneHundredThousandUsdts);
  });

  async function deployTrustedNgoManager() {
    const TrustedNGOsManager = await ethers.getContractFactory(
      "TrustedNGOsManager"
    );
    const trustedNGOsManagerContract = await TrustedNGOsManager.connect(
      owner
    ).deploy();
    await trustedNGOsManagerContract.deployed();
    await trustedNGOsManagerContract.addNgo(
      ethers.utils.formatBytes32String("Ngo 1"),
      trustedNgo1.address
    );
    await trustedNGOsManagerContract.addNgo(
      ethers.utils.formatBytes32String("Ngo 2"),
      trustedNgo2.address
    );
    await trustedNGOsManagerContract.addNgo(
      ethers.utils.formatBytes32String("Ngo 3"),
      trustedNgo3.address
    );
    await trustedNGOsManagerContract.addNgo(
      ethers.utils.formatBytes32String("Ngo 4"),
      trustedNgo4.address
    );
    return trustedNGOsManagerContract;
  }

  async function deployInvestmentPool() {
    const InvestmentPool = await ethers.getContractFactory("InvestmentPool");
    const investmentPoolContract = await InvestmentPool.deploy([
      {
        symbol: daiAsBytes32,
        tokenAddress: daiContract.address,
        cTokenAddress: cDaiContract.address,
      },
      {
        symbol: usdcAsBytes32,
        tokenAddress: usdcContract.address,
        cTokenAddress: cUsdcContract.address,
      },
      {
        symbol: usdtAsBytes32,
        tokenAddress: usdtContract.address,
        cTokenAddress: cUsdtContract.address,
      },
    ]);
    await investmentPoolContract.deployed();
    return investmentPoolContract;
  }

  describe("Invest token", function () {
    it("Should invest token and see the amount on the investment pool contract", async function () {
      await daiContract.approve(smartDonationContract.address, oneThousandDais);
      await smartDonationContract.investToken(daiAsBytes32, oneThousandDais);

      const totalInvestedDai =
        await smartDonationContract.getTokenInvestedAmount(daiAsBytes32);

      expect(totalInvestedDai).to.be.equal(oneThousandDais);
    });

    it("Should be able to invest multiple tokens and see your invested amount on each one", async function () {
      const tokens = [
        {
          symbol: daiAsBytes32,
          contract: daiContract,
          cContract: cDaiContract,
          amount: oneThousandDais,
        },
        {
          symbol: usdcAsBytes32,
          contract: usdcContract,
          cContract: cUsdcContract,
          amount: oneHundredThousandUsdcs,
        },
        {
          symbol: usdtAsBytes32,
          contract: usdtContract,
          cContract: cUsdtContract,
          amount: oneHundredThousandUsdts,
        },
      ];

      tokens.forEach(async (token) => {
        await token.contract
          .connect(donor1)
          .approve(smartDonationContract.address, token.amount);
        await token.contract
          .connect(donor2)
          .approve(smartDonationContract.address, token.amount);
        await smartDonationContract.investToken(token.symbol, token.amount);
        const totalInvestedToken =
          await smartDonationContract.getTokenInvestedAmount(token.symbol);
        expect(totalInvestedToken).to.be.equal(token.amount);
      });
    });

    it("Should be able to invest multiple tokens and see the invested amount of each one on the investment pool cToken balance", async function () {
      const tokens = [
        {
          symbol: daiAsBytes32,
          contract: daiContract,
          cContract: cDaiContract,
          amount: oneThousandDais,
        },
        {
          symbol: usdcAsBytes32,
          contract: usdcContract,
          cContract: cUsdcContract,
          amount: oneHundredThousandUsdcs,
        },
        {
          symbol: usdtAsBytes32,
          contract: usdtContract,
          cContract: cUsdtContract,
          amount: oneHundredThousandUsdts,
        },
      ];

      const investmentPoolContract =
        await smartDonationContract.investmentPool();

      tokens.forEach(async (token) => {
        await token.contract.approve(
          smartDonationContract.address,
          token.amount
        );
        await smartDonationContract.investToken(token.symbol, token.amount);
        const cTokenBalance = await token.cContract.balanceOf(
          investmentPoolContract
        );
        const cTokenExchangeRate = await token.cContract.exchangeRateStored();
        const cTokenBalanceInTokens = cTokenToToken(
          cTokenBalance,
          cTokenExchangeRate
        );
        expect(cTokenBalanceInTokens).to.be.closeTo(token.amount, 1e10);
      });
    });

    it("Should subtract used token allowance after investment", async function () {
      await daiContract.approve(smartDonationContract.address, oneThousandDais);

      const allowanceBefore = await daiContract.allowance(
        donor1.address,
        smartDonationContract.address
      );

      await smartDonationContract.investToken(daiAsBytes32, oneThousandDais);

      const allowanceAfter = await daiContract.allowance(
        donor1.address,
        smartDonationContract.address
      );

      expect(allowanceAfter).to.be.equal(allowanceBefore.sub(oneThousandDais));
    });

    it("Should emit Investment event when investing token", async function () {
      await daiContract.approve(smartDonationContract.address, oneThousandDais);

      await expect(
        smartDonationContract.investToken(daiAsBytes32, oneThousandDais)
      )
        .to.emit(smartDonationContract, "Investment")
        .withArgs(donor1.address, daiAsBytes32, oneThousandDais);
    });

    it("Should not be able to invest without sufficient allowance", async function () {
      await daiContract.approve(
        smartDonationContract.address,
        oneThousandDais.sub(1)
      );

      await expect(
        smartDonationContract.investToken(daiAsBytes32, oneThousandDais)
      ).to.be.revertedWith("Dai/insufficient-allowance");
    });

    it("Should not be able to invest on a token that is not on the invertible tokens list", async function () {
      await expect(
        smartDonationContract.investToken(
          ethers.utils.formatBytes32String("INVALID-TOKEN"),
          ethers.utils.parseUnits("10", 18)
        )
      ).to.be.revertedWith("Invalid token symbol");
    });
  });

  describe("Token generated interests", function () {
    it("Should not be able to get the generated interests of a token that is not on the invertible tokens list", async function () {
      await expect(
        smartDonationContract.getTokenGeneratedInterests(
          ethers.utils.formatBytes32String("INVALID-TOKEN")
        )
      ).to.be.revertedWith("Invalid token symbol");
    });
  });

  describe("Total invested token", function () {
    it("Should not be able to get the total invested of a token that is not on the invertible tokens list", async function () {
      await expect(
        smartDonationContract.getTokenInvestedAmount(
          ethers.utils.formatBytes32String("INVALID-TOKEN")
        )
      ).to.be.revertedWith("Invalid token symbol");
    });
  });

  describe("Invertible tokens", function () {
    it("Should be able to get the symbols of invertible tokens", async function () {
      const tokenSymbols = await smartDonationContract.getInvertibleTokens();
      tokenSymbols.forEach((tokenSymbol) => {
        expect(tokenSymbolsAsBytes32).to.contains(tokenSymbol);
      });
      expect(tokenSymbols.length).to.be.equal(tokenSymbolsAsBytes32.length);
    });
  });

  describe("Trusted NGOs", function () {
    it("Should be able to get the addresses of the trusted NGOs", async function () {
      const trustedNgoAddresses =
        await smartDonationContract.getTrustedNGOs();
      trustedNGOs
        .map((d) => d.address)
        .forEach((trustedNgo) => {
          expect(trustedNgoAddresses).to.contains(trustedNgo);
        });
      expect(trustedNgoAddresses.length).to.be.equal(trustedNGOs.length);
    });
  });

  describe("Donate token generated interests", function () {
    it("Should emit Donate event when donating", async function () {
      const NGOs = [{ NgoAddress: trustedNgo1.address, percentage: 100 }];

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );

      const donateTransaction =
        await smartDonationContract.donateTokensGeneratedInterests(NGOs);
      const donateReceipt = await donateTransaction.wait();
      const donationEvent = donateReceipt.events!.find(
        (event) => event.event === "Donation"
      );
      const [from, to, symbol] = donationEvent!.args!;

      expect(from).to.be.equals(donor1.address);
      expect(to).to.be.equals(NGOs[0].NgoAddress);
      expect(symbol).to.be.equals(daiAsBytes32);
    });

    it("Should donate to multiple NGOs", async function () {
      const NGOs = [
        { NgoAddress: trustedNgo1.address, percentage: 23 },
        { NgoAddress: trustedNgo2.address, percentage: 24 },
        { NgoAddress: trustedNgo3.address, percentage: 26 },
        { NgoAddress: trustedNgo4.address, percentage: 27 },
      ];

      const NGOsBalanceBeforeDonation = await Promise.all(
        NGOs.map(async (Ngo) => daiContract.balanceOf(Ngo.NgoAddress))
      );

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );
      const donateTransaction =
        await smartDonationContract.donateTokensGeneratedInterests(NGOs);
      const donateReceipt = await donateTransaction.wait();
      const donationEvents = donateReceipt.events!.filter(
        (event) => event.event === "Donation"
      );

      const NGOsBalanceAfterDonation = await Promise.all(
        NGOs.map(async (Ngo) => daiContract.balanceOf(Ngo.NgoAddress))
      );

      NGOs.forEach((Ngo, index) => {
        const NgoDonationEvent = donationEvents.find(
          (donationEvent) => donationEvent.args!.to === Ngo.NgoAddress
        );
        const [from, to, symbol, amount] = NgoDonationEvent!.args!;
        const NgoBalanceBeforeDonation = NGOsBalanceBeforeDonation[index];
        const NgoBalanceAfterDonation = NGOsBalanceAfterDonation[index];
        expect(from).to.be.equals(donor1.address);
        expect(to).to.be.equals(Ngo.NgoAddress);
        expect(symbol).to.be.equals(daiAsBytes32);
        expect(amount).to.be.equals(
          NgoBalanceAfterDonation.sub(NgoBalanceBeforeDonation)
        );
      });
    });

    it("Should donate to multiple tokens", async function () {
      const Ngo = { NgoAddress: trustedNgo1.address, percentage: 100 };
      const tokens = [
        {
          symbol: daiAsBytes32,
          contract: daiContract,
          amount: oneHundredThousandDais,
        },
        {
          symbol: usdcAsBytes32,
          contract: usdcContract,
          amount: oneHundredThousandUsdcs,
        },
        {
          symbol: usdtAsBytes32,
          contract: usdtContract,
          cContract: cUsdtContract,
          amount: oneHundredThousandUsdts,
        },
      ];

      const NgoTokensBalanceBeforeDonation = await Promise.all(
        tokens.map(async (token) =>
          token.contract.balanceOf(Ngo.NgoAddress)
        )
      );

      await Promise.all(
        tokens.map(async (token) => {
          await token.contract.approve(
            smartDonationContract.address,
            token.amount
          );
          await smartDonationContract.investToken(token.symbol, token.amount);
        })
      );

      const donateTransaction =
        await smartDonationContract.donateTokensGeneratedInterests([Ngo]);
      const donateReceipt = await donateTransaction.wait();
      const donationEvents = donateReceipt.events!.filter(
        (event) => event.event === "Donation"
      );

      const NgoTokensBalanceAfterDonation = await Promise.all(
        tokens.map(async (token) =>
          token.contract.balanceOf(Ngo.NgoAddress)
        )
      );

      tokens.forEach((token, index) => {
        const tokenDonationEvent = donationEvents.find(
          (donationEvent) => donationEvent.args!.symbol === token.symbol
        );
        const [from, to, symbol, amount] = tokenDonationEvent!.args!;
        const NgoTokenBalanceBeforeDonation =
          NgoTokensBalanceBeforeDonation[index];
        const NgoTokenBalanceAfterDonation =
          NgoTokensBalanceAfterDonation[index];
        expect(from).to.be.equals(donor1.address);
        expect(to).to.be.equals(Ngo.NgoAddress);
        expect(symbol).to.be.equals(token.symbol);
        expect(amount).to.be.equals(
          NgoTokenBalanceAfterDonation.sub(NgoTokenBalanceBeforeDonation)
        );
      });
    });

    it("Should donate to multiple NGOs and tokens", async function () {
      const NGOs = [
        {
          NgoAddress: trustedNgo1.address,
          percentage: 23,
          tokenBalancesBeforeDonation: <Array<BigNumber>>[],
          tokenBalancesAfterDonation: <Array<BigNumber>>[],
        },
        {
          NgoAddress: trustedNgo2.address,
          percentage: 24,
          tokenBalancesBeforeDonation: <Array<BigNumber>>[],
          tokenBalancesAfterDonation: <Array<BigNumber>>[],
        },
        {
          NgoAddress: trustedNgo3.address,
          percentage: 26,
          tokenBalancesBeforeDonation: <Array<BigNumber>>[],
          tokenBalancesAfterDonation: <Array<BigNumber>>[],
        },
        {
          NgoAddress: trustedNgo4.address,
          percentage: 27,
          tokenBalancesBeforeDonation: <Array<BigNumber>>[],
          tokenBalancesAfterDonation: <Array<BigNumber>>[],
        },
      ];
      const tokens = [
        {
          symbol: daiAsBytes32,
          contract: daiContract,
          amount: oneHundredThousandDais,
        },
        {
          symbol: usdcAsBytes32,
          contract: usdcContract,
          amount: oneHundredThousandUsdcs,
        },
        {
          symbol: usdtAsBytes32,
          contract: usdtContract,
          cContract: cUsdtContract,
          amount: oneHundredThousandUsdts,
        },
      ];

      NGOs.forEach(async (Ngo) => {
        Ngo.tokenBalancesBeforeDonation = await Promise.all(
          tokens.map(async (token) =>
            token.contract.balanceOf(Ngo.NgoAddress)
          )
        );
      });

      await Promise.all(
        tokens.map(async (token) => {
          await token.contract.approve(
            smartDonationContract.address,
            token.amount
          );
          await smartDonationContract.investToken(token.symbol, token.amount);
        })
      );

      const donateTransaction =
        await smartDonationContract.donateTokensGeneratedInterests(NGOs);
      const donateReceipt = await donateTransaction.wait();
      const donationEvents = donateReceipt.events!.filter(
        (event) => event.event === "Donation"
      );

      NGOs.forEach(async (Ngo) => {
        Ngo.tokenBalancesAfterDonation = await Promise.all(
          tokens.map(async (token) =>
            token.contract.balanceOf(Ngo.NgoAddress)
          )
        );

        tokens.forEach((token, tokenIndex) => {
          const tokenDonationEvent = donationEvents.find(
            (donationEvent) =>
              donationEvent.args!.to === Ngo.NgoAddress &&
              donationEvent.args!.symbol === token.symbol
          );
          const [from, to, symbol, amount] = tokenDonationEvent!.args!;
          const NgoTokenBalanceBeforeDonation =
            Ngo.tokenBalancesBeforeDonation[tokenIndex];
          const NgoTokenBalanceAfterDonation =
            Ngo.tokenBalancesAfterDonation[tokenIndex];
          expect(from).to.be.equals(donor1.address);
          expect(to).to.be.equals(Ngo.NgoAddress);
          expect(symbol).to.be.equals(token.symbol);
          expect(amount).to.be.equals(
            NgoTokenBalanceAfterDonation.sub(NgoTokenBalanceBeforeDonation)
          );
        });
      });
    });

    it("Should have Ngo token balance the same token amount as token generated interests", async function () {
      const NGOs = [{ NgoAddress: trustedNgo1.address, percentage: 100 }];

      const Ngo1BalanceBeforeDonation = await daiContract.balanceOf(
        trustedNgo1.address
      );

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );

      const donateTransaction =
        await smartDonationContract.donateTokensGeneratedInterests(NGOs);
      const donateReceipt = await donateTransaction.wait();
      const donationEvent = donateReceipt.events!.find(
        (event) => event.event === "Donation"
      );
      const donatedAmount = donationEvent!.args!.amount;

      const Ngo1BalanceAfterDonation = await daiContract.balanceOf(
        trustedNgo1.address
      );

      expect(
        Ngo1BalanceAfterDonation.sub(Ngo1BalanceBeforeDonation)
      ).to.be.equals(donatedAmount);
    });

    it("Should not change investment pool token balance with donation", async function () {
      const NGOs = [
        { NgoAddress: trustedNgo1.address, percentage: 33 },
        { NgoAddress: trustedNgo2.address, percentage: 33 },
        { NgoAddress: trustedNgo3.address, percentage: 33 },
        { NgoAddress: trustedNgo4.address, percentage: 1 },
      ];

      await daiContract
        .connect(donor2)
        .approve(smartDonationContract.address, oneHundredThousandDais);
      await smartDonationContract
        .connect(donor2)
        .investToken(daiAsBytes32, oneHundredThousandDais);

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );

      const donor1InvestmentPool = await smartDonationContract.investmentPool();

      const investmentPoolBalanceBeforeDonation = await daiContract.balanceOf(
        donor1InvestmentPool
      );

      await smartDonationContract.donateTokensGeneratedInterests(NGOs);

      const investmentPoolBalanceAfterDonation = await daiContract.balanceOf(
        donor1InvestmentPool
      );

      expect(investmentPoolBalanceAfterDonation).to.be.equals(
        investmentPoolBalanceBeforeDonation
      );
    });

    it("Should revert if there is an untrusted Ngo", async function () {
      const NGOs = [
        { NgoAddress: untrustedNgo.address, percentage: 100 },
      ];

      await daiContract.approve(smartDonationContract.address, oneThousandDais);
      await smartDonationContract.investToken(daiAsBytes32, oneThousandDais);

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("Only trusted NGOs are valid");
    });

    it("Should revert if there isn't any Ngo", async function () {
      await daiContract.approve(smartDonationContract.address, oneThousandDais);
      await smartDonationContract.investToken(daiAsBytes32, oneThousandDais);

      await expect(
        smartDonationContract.donateTokensGeneratedInterests([])
      ).to.be.revertedWith("There must be at least one Ngo");
    });

    it("Should revert if no interests where generated", async function () {
      const NGOs = [{ NgoAddress: trustedNgo1.address, percentage: 100 }];

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("No generated interests");
    });

    it("Should revert if a Ngo's percentage is 0", async function () {
      const NGOs = [{ NgoAddress: trustedNgo1.address, percentage: 0 }];

      await daiContract.approve(smartDonationContract.address, oneThousandDais);
      await smartDonationContract.investToken(daiAsBytes32, oneThousandDais);

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("Percentage must be between 1-100");
    });

    it("Should revert if a Ngo's percentage is more than 100", async function () {
      const NGOs = [{ NgoAddress: trustedNgo1.address, percentage: 101 }];

      await daiContract.approve(smartDonationContract.address, oneThousandDais);
      await smartDonationContract.investToken(daiAsBytes32, oneThousandDais);

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("Percentage must be between 1-100");
    });

    it("Should revert if the sum of Ngo's percentage is less than 100", async function () {
      const NGOs = [
        { NgoAddress: trustedNgo1.address, percentage: 45 },
        { NgoAddress: trustedNgo2.address, percentage: 45 },
        { NgoAddress: trustedNgo3.address, percentage: 9 },
      ];

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("Total percentage must be 100");
    });

    it("Should revert if the sum of Ngo's percentage is more than 100", async function () {
      const NGOs = [
        { NgoAddress: trustedNgo1.address, percentage: 50 },
        { NgoAddress: trustedNgo2.address, percentage: 50 },
        { NgoAddress: trustedNgo3.address, percentage: 1 },
      ];

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );

      await daiContract
        .connect(donor2)
        .approve(smartDonationContract.address, oneHundredThousandDais);
      await smartDonationContract
        .connect(donor2)
        .investToken(daiAsBytes32, oneHundredThousandDais);

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("Total percentage must be 100");
    });

    it("Should revert if a Ngo address is 0", async function () {
      const NGOs = [
        {
          NgoAddress: "0x0000000000000000000000000000000000000000",
          percentage: 50,
        },
        { NgoAddress: trustedNgo2.address, percentage: 50 },
        { NgoAddress: trustedNgo3.address, percentage: 1 },
      ];

      await daiContract.approve(
        smartDonationContract.address,
        oneHundredThousandDais
      );
      await smartDonationContract.investToken(
        daiAsBytes32,
        oneHundredThousandDais
      );

      await daiContract
        .connect(donor2)
        .approve(smartDonationContract.address, oneHundredThousandDais);
      await smartDonationContract
        .connect(donor2)
        .investToken(daiAsBytes32, oneHundredThousandDais);

      await expect(
        smartDonationContract.donateTokensGeneratedInterests(NGOs)
      ).to.be.revertedWith("Ngo address cannot be 0");
    });
  });
});
