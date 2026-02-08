// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EduToken is ERC20, Ownable {
    address public crowdfundingContract;

    constructor() ERC20("EduToken", "EDU") Ownable(msg.sender) {}

    modifier onlyCrowdfunding() {
        require(
            msg.sender == crowdfundingContract,
            "Not crowdfunding contract"
        );
        _;
    }

    function setCrowdfundingContract(address _contract) external onlyOwner {
        require(_contract != address(0), "Invalid address");
        crowdfundingContract = _contract;
    }

    function mint(address to, uint256 amount) external onlyCrowdfunding {
        _mint(to, amount);
    }
}
