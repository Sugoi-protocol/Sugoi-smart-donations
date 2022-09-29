// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Trusted NGOs Manager
 *
 * @dev This contract is used to manage the trusted NGOs.
 *
 * The trusted NGOs are the ones that are allowed to receive the
 * generated interests from donors. They are managed by the owner of the
 * contract.
 */
contract TrustedNGOsManager is Ownable {
    event AddNgo(bytes32 NgoName, address NgoAddress);
    event DisableNgo(bytes32 NgoName, address NgoAddress);
    event EnableNgo(bytes32 NgoName, address NgoAddress);

    struct Ngo {
        bytes32 name;
        bool enabled;
    }

    mapping(address => Ngo) public NGOs;
    address[] public NgoAddresses;

    /**
     * @dev Add a new Ngo to the list of trusted NGOs.
     *
     * @param _name The name of the Ngo.
     * @param _addr The address of the Ngo.
     */
    function addNgo(bytes32 _name, address _addr) external onlyOwner {
        require(_addr != address(0), "Address cannot be 0");
        require(NGOs[_addr].name == "", "Ngo already exists");
        require(_name != "", "Name cannot be empty");
        NGOs[_addr] = Ngo(_name, true);
        NgoAddresses.push(_addr);
        emit AddNgo(_name, _addr);
    }

    /**
     * @dev Disable a Ngo from receiving donations.
     *
     * @param _addr The address of the Ngo.
     */
    function disableNgo(address _addr) external onlyOwner {
        Ngo storage Ngo = NGOs[_addr];
        require(Ngo.name != 0, "Ngo does not exist");
        Ngo.enabled = false;
        emit DisableNgo(Ngo.name, _addr);
    }

    /**
     * @dev Enable a Ngo to receive donations.
     *
     * @param _addr The address of the Ngo.
     */
    function enableNgo(address _addr) external onlyOwner {
        Ngo storage Ngo = NGOs[_addr];
        require(Ngo.name != 0, "Ngo does not exist");
        Ngo.enabled = true;
        emit EnableNgo(Ngo.name, _addr);
    }

    /**
     * @dev Return if a Ngo is enabled to receive donations.
     */
    function isNgoEnabled(address _addr) external view returns (bool) {
        return NGOs[_addr].enabled;
    }

    /**
     * @dev Return the addresses of all the NGOs.
     */
    function getNGOs() external view returns (address[] memory) {
        return NgoAddresses;
    }
}
