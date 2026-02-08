let provider;
let signer;
let userAddress;
let tokenContract;
let fundContract;

// Load deployments.json
async function loadDeployments() {
	try {
		// deployments.json should be in frontend/public/
		const res = await fetch('deployments.json');
		const deployments = await res.json();

		const tokenAddress = deployments.token.address;
		const fundAddress = deployments.fund.address;

		// ABIs are already arrays! No need to JSON.parse or replace
		const tokenABI = deployments.token.abi;
		const fundABI = deployments.fund.abi;

		return { tokenAddress, fundAddress, tokenABI, fundABI };
	} catch (err) {
		console.error('Failed to load deployments.json:', err);
		alert(
			'Could not load contract info. Make sure deployments.json is accessible.',
		);
	}
}

async function connect() {
	if (!window.ethereum) {
		alert('Install MetaMask');
		return;
	}

	provider = new ethers.BrowserProvider(window.ethereum);
	await provider.send('eth_requestAccounts', []);
	signer = await provider.getSigner();
	userAddress = await signer.getAddress();

	document.getElementById('account').innerText = userAddress;

	const network = await provider.getNetwork();
	const currentChainId = network.chainId;

	if (currentChainId !== 11155111n) {
		document.getElementById('network').innerText = 'Wrong network';

		try {
			await window.ethereum.request({
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: '0xaa36a7' }],
			});
			window.location.reload();
		} catch (e) {
			alert('Please switch to Sepolia in MetaMask manually');
		}
		return;
	}

	document.getElementById('network').innerText = 'Sepolia';

	// Load deployments
	const { tokenAddress, fundAddress, tokenABI, fundABI } =
		await loadDeployments();

	// Initialize contracts
	tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
	fundContract = new ethers.Contract(fundAddress, fundABI, signer);

	await updateBalances();
}

async function updateBalances() {
	try {
		const ethBalance = await provider.getBalance(userAddress);
		document.getElementById('ethBalance').innerText = parseFloat(
			ethers.formatEther(ethBalance),
		).toFixed(4);

		const decimals = await tokenContract.decimals();
		const tokenBalance = await tokenContract.balanceOf(userAddress);
		document.getElementById('tokenBalance').innerText = ethers.formatUnits(
			tokenBalance,
			decimals,
		);
	} catch (err) {
		console.error('Balance error:', err);
	}
}

async function contribute() {
	const campaignId = document.getElementById('campaignId').value;
	const amountEth = document.getElementById('amount').value;

	if (campaignId === '' || amountEth <= 0) {
		alert('Enter your campaign ID and ETH amount');
		return;
	}

	try {
		const tx = await fundContract.contribute(campaignId, {
			value: ethers.parseEther(amountEth),
		});
		alert('The transaction has been sent. Awaiting confirmation...');
		await tx.wait();
		alert('Success! ETH sent, tokens credited.');
		await updateBalances();
	} catch (err) {
		console.error('Transaction error:', err);
		alert('Transaction error. Check your console.');
	}
}

async function createCampaign() {
	const title = document.getElementById('campaignTitle').value;
	if (!title) {
		alert('Enter campaign name');
		return;
	}

	try {
		const tx = await fundContract.createCampaign(title);
		alert("We're creating a campaign... Waiting for the blockchain");
		await tx.wait();
		alert('The campaign has been successfully created!');
	} catch (err) {
		console.error('Create error:', err);
		alert('Error creating. Check your console.');
	}
}

// Event listeners
document.getElementById('connectButton').onclick = connect;
document.getElementById('sendButton').onclick = contribute;
document.getElementById('createButton').onclick = createCampaign;

if (window.ethereum) {
	window.ethereum.on('chainChanged', () => window.location.reload());
	window.ethereum.on('accountsChanged', () => window.location.reload());
}
