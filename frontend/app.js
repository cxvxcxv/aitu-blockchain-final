let provider;
let signer;
let userAddress;
let tokenContract;
let tokenContractSigner;
let fundContract;

async function loadDeployments() {
	try {
		const res = await fetch('deployments.json');
		const deployments = await res.json();

		const tokenAddress = deployments.token.address;
		const fundAddress = deployments.fund.address;

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

	const { tokenAddress, fundAddress, tokenABI, fundABI } =
		await loadDeployments();

	tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
	tokenContractSigner = new ethers.Contract(tokenAddress, tokenABI, signer);
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
	const goalEth = document.getElementById('campaignGoal').value;
	const durationDays = document.getElementById('campaignDuration').value;

	if (!title || !goalEth || !durationDays) {
		alert('Enter campaign title, goal, and duration');
		return;
	}

	const goalWei = ethers.parseEther(goalEth);
	const durationSec = parseInt(durationDays) * 24 * 60 * 60;

	try {
		const tx = await fundContract.createCampaign(title, goalWei, durationSec);
		alert('Creating campaign... waiting for blockchain confirmation');
		await tx.wait();
		alert('Campaign successfully created!');
	} catch (err) {
		console.error('Create campaign error:', err);
		alert('Error creating campaign. Check console.');
	}
}

document.getElementById('connectButton').onclick = connect;
document.getElementById('sendButton').onclick = contribute;
document.getElementById('createButton').onclick = createCampaign;

if (window.ethereum) {
	window.ethereum.on('chainChanged', () => window.location.reload());
	window.ethereum.on('accountsChanged', () => window.location.reload());
}

async function faucetTokens() {
	if (!fundContract) {
		alert('Please connect your wallet first');
		return;
	}

	const amount = document.getElementById('faucetAmount').value;
	if (!amount || amount <= 0) {
		alert('Enter a valid amount');
		return;
	}

	try {
		const decimals = await tokenContract.decimals();
		const amountParsed = ethers.parseUnits(amount, decimals);

		const tx = await fundContract.faucet(amountParsed);
		alert('Minting tokens via fund contract... waiting for confirmation');
		await tx.wait();

		alert('Tokens minted successfully!');
		await updateBalances();
	} catch (err) {
		console.error('Faucet error:', err);
		alert('Error minting tokens. Check console.');
	}
}

document.getElementById('faucetButton').onclick = faucetTokens;
