// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./InvestmentPool.sol";
import "./TrustedNGOsManager.sol";
import "./dtos/DonatedNgoDTO.sol";

/**
 * @title Smart Donation
 * 
 * @dev Smart contract for donation.
 *
 * It allows donors to invest ERC20 tokens and donate the interests generated
 * by each of them to the trusted NGOs managed by {TrustedNGOsManager}.
 *
 * This contract needs to be approved by the ERC20 contract with the desired
 * amount before investing. It uses {InvestmentPool} to handle the investemnts.
 *
 * Accounts can also check their interests generated, the total amount invested,
 * the available tokens to invest and the trusted NGOs list.
 */
contract SmartDonation {
    using SafeERC20 for IERC20;

    event Investment(
        address indexed from,
        bytes32 indexed symbol,
        uint256 amount
    );
    event Donation(
        address indexed from,
        address indexed to,
        bytes32 indexed symbol,
        uint256 amount
    );

    TrustedNGOsManager public trustedNGOsManager;
    InvestmentPool public investmentPool;

    constructor(
        address _trustedNGOsManagerAddress,
        address _investmentPoolAddress
    ) {
        trustedNGOsManager = TrustedNGOsManager(
            _trustedNGOsManagerAddress
        );
        investmentPool = InvestmentPool(_investmentPoolAddress);
    }

    /**
     * @dev Allows to invest ERC20 tokens. This tokens will be used to
     * generate interests using the {InvestmentPool} contract.
     * 
     * Consider that the invested tokens can't be withdrawn.
     * 
     * Sender must have approved this contract with the desired amount before
     * investing.
     * 
     * @param _symbol The symbol of the token to invest.
     * @param _amount The amount of tokens to invest.
     */
    function investToken(bytes32 _symbol, uint256 _amount) external {
        IERC20(investmentPool.getTokenAddress(_symbol)).safeTransferFrom(
            msg.sender,
            address(investmentPool),
            _amount
        );
        investmentPool.investToken(msg.sender, _symbol, _amount);
        emit Investment(msg.sender, _symbol, _amount);
    }

    /**
     * @dev Allows to donate the interests generated by the sender to the
     * trusted NGOs.
     *
     * @param _donatedNgoDTOs An array of DTOs (Data transfer objects) that holds
     * the address of each Ngo and the percentage of the total interests generated
     * that should be donated. The percentage must be an uint between 1 and 100.
     * The sum of all percentages must be 100.
     */
    function donateTokensGeneratedInterests(
        DonatedNgoDTO[] calldata _donatedNgoDTOs
    ) external {
        require(
            _donatedNgoDTOs.length > 0,
            "There must be at least one Ngo"
        );
        validateNGOs(_donatedNgoDTOs);
        bool hasGeneratedInterests = false;
        bytes32[] memory invertibleTokenSymbols = investmentPool
            .getInvertibleTokenSymbols();
        for (uint256 i = 0; i < invertibleTokenSymbols.length; i++) {
            bool _hasGeneratedInterests = donateTokenGeneratedInterests(
                invertibleTokenSymbols[i],
                _donatedNgoDTOs
            );
            if (_hasGeneratedInterests) {
                hasGeneratedInterests = true;
            }
        }
        require(hasGeneratedInterests, "No generated interests");
    }


    /**
     * @dev Return the currently generated interests of the sender.
     * 
     * Consider that if the sender donate the interests, the amount of
     * interests generated will become 0.
     * 
     * @param _symbol The symbol of the token to check.
     */
    function getTokenGeneratedInterests(bytes32 _symbol)
        external
        view
        returns (uint256)
    {
        return
            investmentPool.getTokenGeneratedInterestsStored(
                msg.sender,
                _symbol
            );
    }

    /**
     * @dev Return the total amount of tokens invested by the sender.
     * 
     * @param _symbol The symbol of the token to check.
     */
    function getTokenInvestedAmount(bytes32 _symbol)
        external
        view
        returns (uint256)
    {
        return investmentPool.getTokenInvestedAmount(msg.sender, _symbol);
    }

    /**
     * @dev Return the symbols of the tokens available to invest.
     */
    function getInvertibleTokens() external view returns (bytes32[] memory) {
        return investmentPool.getInvertibleTokenSymbols();
    }

    /**
     * @dev Return the addresses of the trusted NGOs.
    */
    function getTrustedNGOs() external view returns (address[] memory) {
        return trustedNGOsManager.getNGOs();
    }

    function donateTokenGeneratedInterests(
        bytes32 _symbol,
        DonatedNgoDTO[] memory _donatedNgoDTOs
    ) internal returns (bool) {
        uint256 generatedInterests = investmentPool
            .redeemTokenGeneratedInterests(msg.sender, _symbol);
        if (generatedInterests == 0) {
            return false;
        }
        uint256 totalDonated = 0;
        for (uint256 i = 0; i < _donatedNgoDTOs.length; i++) {
            address NgoAddress = _donatedNgoDTOs[i].NgoAddress;
            uint8 percentage = _donatedNgoDTOs[i].percentage;
            bool lastNgo = i == _donatedNgoDTOs.length - 1;
            uint256 amount = lastNgo
                ? (generatedInterests - totalDonated) // Avoid rounding errors
                : (generatedInterests * percentage) / 100;
            totalDonated += amount;
            investmentPool.transferToken(_symbol, NgoAddress, amount);
            emit Donation(msg.sender, NgoAddress, _symbol, amount);
        }
        return true;
    }

    function validateNGOs(DonatedNgoDTO[] memory _donatedNgoDTOs)
        internal
        view
    {
        uint8 totalPercentage = 0;
        for (uint256 i = 0; i < _donatedNgoDTOs.length; i++) {
            address NgoAddress = _donatedNgoDTOs[i].NgoAddress;
            uint8 percentage = _donatedNgoDTOs[i].percentage;
            require(
                percentage > 0 && percentage <= 100,
                "Percentage must be between 1-100"
            );
            require(NgoAddress != address(0), "Ngo address cannot be 0");
            require(
                trustedNGOsManager.isNgoEnabled(NgoAddress),
                "Only trusted NGOs are valid"
            );
            totalPercentage += percentage;
        }
        require(totalPercentage == 100, "Total percentage must be 100");
    }
}