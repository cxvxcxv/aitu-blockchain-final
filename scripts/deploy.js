const { ethers } = require("hardhat");

async function main() {

  // deploy ours token 
  const Token = await ethers.getContractFactory("EduToken");
  const token = await Token.deploy();
  await token.waitForDeployment();

  console.log("EduToken deployed to:", await token.getAddress());



  // deploy  crowdfunding contract 
  const Fund = await ethers.getContractFactory("EduFundCrowdfunding");
  const fund = await Fund.deploy(await token.getAddress());
  await fund.waitForDeployment();

  console.log("Crowdfunding deployed to:", await fund.getAddress());


  // connect contracts here 
  await token.setCrowdfundingContract(await fund.getAddress());

  console.log("Contracts linked successfully");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
