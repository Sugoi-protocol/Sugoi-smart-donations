import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TrustedNGOsManager } from "../typechain";
import { ethers } from "hardhat";
import { expect } from "chai";

describe("Trusted NGOs Manager", function () {
  let trustedNGOsManagerContract: TrustedNGOsManager;
  let accounts: SignerWithAddress[];
  let Ngo1: { name: string; address: string };
  let Ngo2: { name: string; address: string };
  let Ngo3: { name: string; address: string };
  let inexistentNgo: { name: string; address: string };

  const Ngo1NameAsBytes32 = ethers.utils.formatBytes32String("Ngo 1");
  const Ngo2NameAsBytes32 = ethers.utils.formatBytes32String("Ngo 2");
  const Ngo3NameAsBytes32 = ethers.utils.formatBytes32String("Ngo 3");
  const inexistentNgoNameAsBytes32 =
    ethers.utils.formatBytes32String("Not a Ngo");

  before(async () => {
    accounts = await ethers.getSigners();
    const [Ngo1Addr, Ngo2Addr, Ngo3Addr, inexistentNgoAddr] = accounts;
    Ngo1 = { name: Ngo1NameAsBytes32, address: Ngo1Addr.address };
    Ngo2 = { name: Ngo2NameAsBytes32, address: Ngo2Addr.address };
    Ngo3 = { name: Ngo3NameAsBytes32, address: Ngo3Addr.address };
    inexistentNgo = {
      name: inexistentNgoNameAsBytes32,
      address: inexistentNgoAddr.address,
    };
  });

  beforeEach(async function () {
    const TrustedNGOsManager = await ethers.getContractFactory(
      "TrustedNGOsManager"
    );
    trustedNGOsManagerContract = await TrustedNGOsManager.deploy();
    await trustedNGOsManagerContract.deployed();
  });

  describe("Add Ngo", function () {
    it("Should add Ngo", async function () {
      await trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address);

      const createdNgo = await trustedNGOsManagerContract.NGOs(
        Ngo1.address
      );

      expect(createdNgo.name).to.be.equals(Ngo1.name);
    });

    it("Should add Ngo with enabled true", async function () {
      await trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address);

      const isNgoEnabled = await trustedNGOsManagerContract.isNgoEnabled(
        Ngo1.address
      );

      expect(isNgoEnabled).to.be.true;
    });

    it("Should add multiple NGOs", async function () {
      await trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address);
      await trustedNGOsManagerContract.addNgo(Ngo2.name, Ngo2.address);
      await trustedNGOsManagerContract.addNgo(Ngo3.name, Ngo3.address);

      const createdNgo1 = await trustedNGOsManagerContract.NGOs(
        Ngo1.address
      );
      const createdNgo2 = await trustedNGOsManagerContract.NGOs(
        Ngo2.address
      );
      const createdNgo3 = await trustedNGOsManagerContract.NGOs(
        Ngo3.address
      );

      expect(createdNgo1.name).to.be.equals(Ngo1.name);
      expect(createdNgo2.name).to.be.equals(Ngo2.name);
      expect(createdNgo3.name).to.be.equals(Ngo3.name);
    });

    it("Should not add Ngo with address 0", async function () {
      const Ngo = {
        name: Ngo1.name,
        address: "0x0000000000000000000000000000000000000000",
      };

      await expect(
        trustedNGOsManagerContract.addNgo(Ngo.name, Ngo.address)
      ).to.be.revertedWith("Address cannot be 0");
    });

    it("Should not add Ngo with existing address", async function () {
      await trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address);

      await expect(
        trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address)
      ).to.be.revertedWith("Ngo already exists");
    });

    it("Should not add Ngo with empty name", async function () {
      const Ngo = {
        name: ethers.utils.formatBytes32String(""),
        address: Ngo1.address,
      };

      await expect(
        trustedNGOsManagerContract.addNgo(Ngo.name, Ngo.address)
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should emit AddNgo event when adding a Ngo", async function () {
      await expect(
        trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address)
      )
        .to.emit(trustedNGOsManagerContract, "AddNgo")
        .withArgs(Ngo1.name, Ngo1.address);
    });
  });

  describe("Disable Ngo", function () {
    beforeEach(async function () {
      await trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address);
    });

    it("Should disabled Ngo", async function () {
      await trustedNGOsManagerContract.disableNgo(Ngo1.address);

      const isNgoEnabled = await trustedNGOsManagerContract.isNgoEnabled(
        Ngo1.address
      );

      expect(isNgoEnabled).to.be.false;
    });

    it("Should not disable inexistent Ngo", async function () {
      await expect(
        trustedNGOsManagerContract.disableNgo(inexistentNgo.address)
      ).to.be.revertedWith("Ngo does not exist");
    });

    it("Should not disable other NGOs", async function () {
      await trustedNGOsManagerContract.addNgo(Ngo2.name, Ngo2.address);

      const isNgo2EnabledBeforeTransaction =
        await trustedNGOsManagerContract.isNgoEnabled(Ngo2.address);

      await trustedNGOsManagerContract.disableNgo(Ngo1.address);

      const isNgo2EnabledAfterTransaction =
        await trustedNGOsManagerContract.isNgoEnabled(Ngo2.address);

      expect(isNgo2EnabledBeforeTransaction).to.be.equals(
        isNgo2EnabledAfterTransaction
      );
    });

    it("Should emit DisableNgo event when disabling a Ngo", async function () {
      await expect(trustedNGOsManagerContract.disableNgo(Ngo1.address))
        .to.emit(trustedNGOsManagerContract, "DisableNgo")
        .withArgs(Ngo1.name, Ngo1.address);
    });
  });

  describe("Enable Ngo", function () {
    beforeEach(async function () {
      await trustedNGOsManagerContract.addNgo(Ngo1.name, Ngo1.address);
    });

    it("Should enable Ngo", async function () {
      await trustedNGOsManagerContract.disableNgo(Ngo1.address);

      await trustedNGOsManagerContract.enableNgo(Ngo1.address);

      const isNgoEnabled = await trustedNGOsManagerContract.isNgoEnabled(
        Ngo1.address
      );

      expect(isNgoEnabled).to.be.true;
    });

    it("Should not enable inexistent Ngo", async function () {
      await expect(
        trustedNGOsManagerContract.enableNgo(inexistentNgo.address)
      ).to.be.revertedWith("Ngo does not exist");
    });

    it("Should not enable other NGOs", async function () {
      await trustedNGOsManagerContract.addNgo(Ngo2.name, Ngo2.address);

      await trustedNGOsManagerContract.disableNgo(Ngo2.address);

      const isNgo2EnabledBeforeTransaction =
        await trustedNGOsManagerContract.isNgoEnabled(Ngo2.address);

      await trustedNGOsManagerContract.enableNgo(Ngo1.address);

      const isNgo2EnabledAfterTransaction =
        await trustedNGOsManagerContract.isNgoEnabled(Ngo2.address);

      expect(isNgo2EnabledBeforeTransaction).to.be.equals(
        isNgo2EnabledAfterTransaction
      );
    });

    it("Should emit EnableNgo event when enabling a Ngo", async function () {
      await expect(trustedNGOsManagerContract.enableNgo(Ngo1.address))
        .to.emit(trustedNGOsManagerContract, "EnableNgo")
        .withArgs(Ngo1.name, Ngo1.address);
    });
  });
});
