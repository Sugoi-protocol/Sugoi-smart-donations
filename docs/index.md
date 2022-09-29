# Solidity API

## InvestmentPool

_This contract is used to manage the invested tokens.

It integrates with Compound Protocol to allow investors to invest in the pool,
and creates an abstraction of this integration. (Could easily add other protocols or networks)

This contract keeps track of every conversion to ensure that external users
only see the underlying token (DAI, USDC...).

SafeERC20  wrapper is used to allow the use of non convencional tokens
like USDT.

All the transactions are only available to the owner, who should be another
contract acting as the controller of the system._

### InvertibleToken

```solidity
struct InvertibleToken {
  contract IERC20 token;
  contract CERC20 cToken;
}
```

### TokenPool

```solidity
struct TokenPool {
  uint256 cTokenBalance;
  uint256 investedAmount;
}
```

### tokenPools

```solidity
mapping(address &#x3D;&gt; mapping(bytes32 &#x3D;&gt; struct InvestmentPool.TokenPool)) tokenPools
```

### invertibleTokens

```solidity
mapping(bytes32 &#x3D;&gt; struct InvestmentPool.InvertibleToken) invertibleTokens
```

### invertibleTokenSymbols

```solidity
bytes32[] invertibleTokenSymbols
```

### constructor

```solidity
constructor(struct InvertibleTokenDTO[] _invertibleTokenDTOs) public
```

### investToken

```solidity
function investToken(address _investor, bytes32 _symbol, uint256 _amount) external
```

_Invest an ERC20 token in the pool from the list of invertible tokens.
This function will mint the cToken of the invertible token with the
specified amount, and will add the minted amount to the cToken balance
of the investor and the invested token amount to the total invested
amount of the investor._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _investor | address | The address of the investor. |
| _symbol | bytes32 | The symbol of the invertible token. |
| _amount | uint256 | The amount of tokens to invest. |

### redeemTokenGeneratedInterests

```solidity
function redeemTokenGeneratedInterests(address _investor, bytes32 _symbol) external returns (uint256)
```

_Redeem the generated interests of an invertible token from the
cToken contract.
This function will withdraw the generated interests of the cToken, and
will remove the minted amount from the cToken balance of the investor.

For more information about the calculation of the generated interests,
see the {_getTokenGeneratedInterests} function._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _investor | address | The address of the investor. |
| _symbol | bytes32 | The symbol of the invertible token. |

### transferToken

```solidity
function transferToken(bytes32 _symbol, address _to, uint256 _amount) external
```

_Transfer an invertible token to an address._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _symbol | bytes32 | The symbol of the invertible token. |
| _to | address | The address to transfer the invertible token to. |
| _amount | uint256 | The amount of tokens to transfer. |

### getTokenAddress

```solidity
function getTokenAddress(bytes32 _symbol) external view returns (address)
```

_Return the address of the contract of an invertible token.

This is normally required for the investor to allow the {SmartDonation}
contract to use its tokens._

### getInvertibleTokenSymbols

```solidity
function getInvertibleTokenSymbols() external view returns (bytes32[])
```

_Return the symbols of the tokens available to invest._

### getTokenInvestedAmount

```solidity
function getTokenInvestedAmount(address _investor, bytes32 _symbol) external view returns (uint256)
```

_Return the total amount of tokens invested by the sender._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _investor | address | The address of the investor. |
| _symbol | bytes32 | The symbol of the token to check. |

### getTokenGeneratedInterestsStored

```solidity
function getTokenGeneratedInterestsStored(address _investor, bytes32 _symbol) external view returns (uint256)
```

_Return the stored generated interests of an investor
for an invertible token.

This function will use the stored exchange rate, that is generated
by the last execution of the {accrueInterest} function inside the
cToken contract.
The result from this function will give you an approximation
of the generated interests, but not the exact value._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _investor | address | The address of the investor. |
| _symbol | bytes32 | The symbol of the invertible token. |

### _getTokenGeneratedInterests

```solidity
function _getTokenGeneratedInterests(address _investor, bytes32 _symbol, uint256 exchangeRate) internal view returns (uint256)
```

_Return the current generated interests of an investor
for an invertible token, with an specific exchange rate. This is
represented with the token value, not the cToken value.

The generated interests is calculated by:
 - Converting the cToken balance to the underlying token. This is done by
   multiplying the cToken balance by the exchange rate, and dividing it
   by the cTokens exponent (1e18).
 - Subtracting the total invested amount of the investor from the result
   of the previous conversion._

## SmartDonation

_Smart contract for donation.
It allows donors to invest ERC20 tokens and donate the interests generated
by each of them to the trusted NGOs managed by {TrustedNGOsManager}.
This contract needs to be approved by the ERC20 contract with the desired
amount before investing. It uses {InvestmentPool} to handle the investemnts.
Accounts can also check their interests generated, the total amount invested,
the available tokens to invest and the trusted NGOs list._

### Investment

```solidity
event Investment(address from, bytes32 symbol, uint256 amount)
```

### Donation

```solidity
event Donation(address from, address to, bytes32 symbol, uint256 amount)
```

### trustedNGOsManager

```solidity
contract TrustedNGOsManager trustedNGOsManager
```

### investmentPool

```solidity
contract InvestmentPool investmentPool
```

### constructor

```solidity
constructor(address _trustedNGOsManagerAddress, address _investmentPoolAddress) public
```

### investToken

```solidity
function investToken(bytes32 _symbol, uint256 _amount) external
```

_Allows to invest ERC20 tokens. This tokens will be used to
generate interests using the {InvestmentPool} contract.

Consider that the invested tokens can&#x27;t be withdrawn.

Sender must have approved this contract with the desired amount before
investing._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _symbol | bytes32 | The symbol of the token to invest. |
| _amount | uint256 | The amount of tokens to invest. |

### donateTokensGeneratedInterests

```solidity
function donateTokensGeneratedInterests(struct DonatedNgoDTO[] _donatedNgoDTOs) external
```

_Allows to donate the interests generated by the sender to the
trusted NGOs._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _donatedNgoDTOs | struct DonatedNgoDTO[] | An array of DTOs (Data transfer objects) that holds the address of each Ngo and the percentage of the total interests generated that should be donated. The percentage must be an uint between 1 and 100. The sum of all percentages must be 100. |

### getTokenGeneratedInterests

```solidity
function getTokenGeneratedInterests(bytes32 _symbol) external view returns (uint256)
```

_Return the currently generated interests of the sender.

Consider that if the sender donate the interests, the amount of
interests generated will become 0._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _symbol | bytes32 | The symbol of the token to check. |

### getTokenInvestedAmount

```solidity
function getTokenInvestedAmount(bytes32 _symbol) external view returns (uint256)
```

_Return the total amount of tokens invested by the sender._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _symbol | bytes32 | The symbol of the token to check. |

### getInvertibleTokens

```solidity
function getInvertibleTokens() external view returns (bytes32[])
```

_Return the symbols of the tokens available to invest._

### getTrustedNGOs

```solidity
function getTrustedNGOs() external view returns (address[])
```

_Return the addresses of the trusted NGOs._

### donateTokenGeneratedInterests

```solidity
function donateTokenGeneratedInterests(bytes32 _symbol, struct DonatedNgoDTO[] _donatedNgoDTOs) internal returns (bool)
```

### validateNGOs

```solidity
function validateNGOs(struct DonatedNgoDTO[] _donatedNgoDTOs) internal view
```

## TrustedNGOsManager

_This contract is used to manage the trusted NGOs.
The trusted NGOs are the ones that are allowed to receive the
generated interests from donors. They are managed by the owner of the
contract._

### AddNgo

```solidity
event AddNgo(bytes32 NgoName, address NgoAddress)
```

### DisableNgo

```solidity
event DisableNgo(bytes32 NgoName, address NgoAddress)
```

### EnableNgo

```solidity
event EnableNgo(bytes32 NgoName, address NgoAddress)
```

### Ngo

```solidity
struct Ngo {
  bytes32 name;
  bool enabled;
}
```

### NGOs

```solidity
mapping(address &#x3D;&gt; struct TrustedNGOsManager.Ngo) NGOs
```

### NgoAddresses

```solidity
address[] NgoAddresses
```

### addNgo

```solidity
function addNgo(bytes32 _name, address _addr) external
```

_Add a new Ngo to the list of trusted NGOs._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | bytes32 | The name of the Ngo. |
| _addr | address | The address of the Ngo. |

### disableNgo

```solidity
function disableNgo(address _addr) external
```

_Disable a Ngo from receiving donations._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The address of the Ngo. |

### enableNgo

```solidity
function enableNgo(address _addr) external
```

_Enable a Ngo to receive donations._

| Name | Type | Description |
| ---- | ---- | ----------- |
| _addr | address | The address of the Ngo. |

### isNgoEnabled

```solidity
function isNgoEnabled(address _addr) external view returns (bool)
```

_Return if a Ngo is enabled to receive donations._

### getNGOs

```solidity
function getNGOs() external view returns (address[])
```

_Return the addresses of all the NGOs._

## DonatedNgoDTO

```solidity
struct DonatedNgoDTO {
  address NgoAddress;
  uint8 percentage;
}
```

## InvertibleTokenDTO

```solidity
struct InvertibleTokenDTO {
  address tokenAddress;
  address cTokenAddress;
  bytes32 symbol;
}
```

## CERC20

_Interface of a cToken from Compound Protocol._

### mint

```solidity
function mint(uint256) external returns (uint256)
```

### balanceOf

```solidity
function balanceOf(address) external view returns (uint256)
```

### exchangeRateStored

```solidity
function exchangeRateStored() external view returns (uint256)
```

### exchangeRateCurrent

```solidity
function exchangeRateCurrent() external returns (uint256)
```

### redeemUnderlying

```solidity
function redeemUnderlying(uint256) external returns (uint256)
```

### accrueInterest

```solidity
function accrueInterest() external returns (uint256)
```

