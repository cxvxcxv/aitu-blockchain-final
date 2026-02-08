// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EduToken.sol";

contract EduFundCrowdfunding {
    struct Campaign {
        address creator;
        string title;
        uint256 goal;
        uint256 deadline;
        uint256 raised;
        bool finalized;
        bool successful;
    }

    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    EduToken public token;

    constructor(address tokenAddress) {
        token = EduToken(tokenAddress);
    }

    function createCampaign(
        string memory title,
        uint256 goal,
        uint256 duration
    ) external {
        require(goal > 0, "Goal must be > 0");
        require(duration > 0, "Duration must be > 0");

        campaignCount++;

        campaigns[campaignCount] = Campaign({
            creator: msg.sender,
            title: title,
            goal: goal,
            deadline: block.timestamp + duration,
            raised: 0,
            finalized: false,
            successful: false
        });
    }

    function contribute(uint256 campaignId) external payable {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator != address(0), "Campaign does not exist");
        require(block.timestamp < campaign.deadline, "Campaign ended");
        require(!campaign.finalized, "Campaign finalized");
        require(msg.value > 0, "Send ETH");

        campaign.raised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        uint256 reward = msg.value * 100;
        token.mint(msg.sender, reward);
    }

    function _autoFinalize(uint256 campaignId) internal {
        Campaign storage campaign = campaigns[campaignId];

        if (!campaign.finalized && block.timestamp >= campaign.deadline) {
            campaign.finalized = true;
            campaign.successful = campaign.raised >= campaign.goal;
        }
    }

    function withdraw(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator != address(0), "Campaign does not exist");

        _autoFinalize(campaignId);

        require(campaign.finalized, "Not finalized");
        require(campaign.successful, "Goal not reached");
        require(msg.sender == campaign.creator, "Not creator");
        require(campaign.raised > 0, "Already withdrawn");

        uint256 amount = campaign.raised;
        campaign.raised = 0;

        (bool success, ) = payable(campaign.creator).call{value: amount}("");
        require(success, "Transfer failed");
    }

    function refund(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator != address(0), "Campaign does not exist");

        _autoFinalize(campaignId);

        require(campaign.finalized, "Not finalized");
        require(!campaign.successful, "Campaign successful");

        uint256 contributed = contributions[campaignId][msg.sender];
        require(contributed > 0, "No contribution");

        contributions[campaignId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: contributed}("");
        require(success, "Refund failed");
    }

    function faucet(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(amount <= 1000 * 1e18, "Max 1000 tokens per call");
        token.mint(msg.sender, amount);
    }
}
