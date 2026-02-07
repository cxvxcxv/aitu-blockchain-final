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
            finalized: false
        });
    }

    function contribute(uint256 campaignId) external payable {

        Campaign storage campaign = campaigns[campaignId];

        require(block.timestamp < campaign.deadline, "Campaign ended");
        require(!campaign.finalized, "Already finalized");
        require(msg.value > 0, "Send ETH");

        campaign.raised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        uint256 reward = msg.value * 100;
        token.mint(msg.sender, reward);
    }

    function finalizeCampaign(uint256 campaignId) external {

        Campaign storage campaign = campaigns[campaignId];

        require(block.timestamp >= campaign.deadline, "Not ended");
        require(!campaign.finalized, "Already finalized");

        campaign.finalized = true;
    }
}
