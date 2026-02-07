const tokenAddress = "0xc2be3c75b0a09E46e7dd9E62Af0A27C5b18D0461";
const fundAddress  = "0xCCaeB0ce27e20842276f4fCeB0bFB8f36283556b";


const tokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const fundABI = [
  "function contribute(uint256 campaignId) payable",
  "function campaigns(uint256) view returns (address, string, uint256, uint256, uint256, bool)"
];


let provider;
let signer;
let userAddress;


async function connect() {
  if (!window.ethereum) {
    alert("Install MetaMask");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  document.getElementById("account").innerText = userAddress;



const network = await provider.getNetwork();
const currentChainId = network.chainId;


if (currentChainId !== 11155111n) {
  document.getElementById("network").innerText = "Wrong network";
  
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], 
    });
    window.location.reload(); 
  } catch (e) {
    alert("Please switch to Sepolia in MetaMask manually");
  }
  return;
}

document.getElementById("network").innerText = "Sepolia";

  await updateBalances();
}


async function updateBalances() {
  try {
   
    const ethBalance = await provider.getBalance(userAddress);
    document.getElementById("ethBalance").innerText =
      parseFloat(ethers.formatEther(ethBalance)).toFixed(4);

  
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    const decimals = await tokenContract.decimals();
    const tokenBalance = await tokenContract.balanceOf(userAddress);

    document.getElementById("tokenBalance").innerText =
      ethers.formatUnits(tokenBalance, decimals);
  } catch (err) {
    console.error("Balance error:", err);
  }
}


async function contribute() {
  const campaignId = document.getElementById("campaignId").value;
  const amountEth  = document.getElementById("amount").value;

  if (campaignId === "" || amountEth <= 0) {
    alert("Enter your campaign ID and ETH amount");
    return;
  }

  const fundContract = new ethers.Contract(fundAddress, fundABI, signer);

  try {
    const tx = await fundContract.contribute(campaignId, {
      value: ethers.parseEther(amountEth)
    });

    alert("The transaction has been sent. Awaiting confirmation...");
    await tx.wait();

    alert("Success! ETH sent, tokens credited.");
    await updateBalances();
  } catch (err) {
    console.error("Transaction error:", err);
    alert("Transaction error. Check your console.");
  }
}


document.getElementById("connectButton").onclick = connect;
document.getElementById("sendButton").onclick = contribute;


if (window.ethereum) {
  window.ethereum.on("chainChanged", () => window.location.reload());
  window.ethereum.on("accountsChanged", () => window.location.reload());
}
