const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
	const Token = await ethers.getContractFactory('EduToken');
	const token = await Token.deploy();
	await token.waitForDeployment();
	const tokenAddress = await token.getAddress();
	console.log('EduToken deployed to:', tokenAddress);

	const Fund = await ethers.getContractFactory('EduFundCrowdfunding');
	const fund = await Fund.deploy(tokenAddress);
	await fund.waitForDeployment();
	const fundAddress = await fund.getAddress();
	console.log('Crowdfunding deployed to:', fundAddress);

	await token.setCrowdfundingContract(fundAddress);
	console.log('Contracts linked successfully');

	const deployments = {
		token: {
			address: tokenAddress,
			abi: Token.interface.format('json'),
		},
		fund: {
			address: fundAddress,
			abi: Fund.interface.format('json'),
		},
	};

	const filePath = path.join(__dirname, '../frontend/', 'deployments.json');
	fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2));
	console.log('deployments.json saved at:', filePath);
}

main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
