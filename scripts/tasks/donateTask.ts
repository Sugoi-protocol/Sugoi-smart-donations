import { task } from "hardhat/config";
import { tokenConfigs } from "./tokenConfigs";

task("donate", "Donate generated interests to trusted NGOs.")
  .addParam("contract", "The SmartDonation contract address.")
  .addParam("address", "The address that make the donation.")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const { contract, address } = taskArgs;

    console.log(`Donating from ${address}...`);

    const signer = await ethers.getSigner(address);

    const smartDonationContract = await hre.ethers.getContractAt(
      "SmartDonation",
      contract
    );

    const trustedNGOs = await smartDonationContract
      .connect(signer)
      .getTrustedNGOs();

    const donatedNGOs = [
      {
        NgoAddress: trustedNGOs[0],
        percentage: 60,
      },
      {
        NgoAddress: trustedNGOs[1],
        percentage: 40,
      },
    ];

    console.log("Donating to", ...donatedNGOs.map((d) => d.NgoAddress));

    await smartDonationContract
      .connect(signer)
      .donateTokensGeneratedInterests(donatedNGOs);

    console.log("Done!");

    for (const token in tokenConfigs) {
      const { tokenAddress } = tokenConfigs[token];

      const tokenContract = await ethers.getContractAt("IERC20", tokenAddress);

      for (const donatedNgo of donatedNGOs) {
        const NgoBalance = await tokenContract
          .connect(signer)
          .balanceOf(donatedNgo.NgoAddress);
        if (!NgoBalance.isZero()) {
          console.log(
            `${token} Balance of ${donatedNgo.NgoAddress}: ${NgoBalance}`
          );
        }
      }
    }
  });
