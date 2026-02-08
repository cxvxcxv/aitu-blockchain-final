let provider;
let signer;
let userAddress;
let tokenContract;
let tokenContractSigner;
let fundContract;

// load deployments.json
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

// connect wallet
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
	await loadCampaigns();
}

// update balances
async function updateBalances() {
	try {
		const ethBalance = await provider.getBalance(userAddress);
		document.getElementById('ethBalance').innerText = parseFloat(
			ethers.formatEther(ethBalance),
		).toFixed(4);

		let decimals = 18;
		try {
			decimals = await tokenContract.decimals();
		} catch (err) {
			console.error('Failed to get token decimals:', err);
		}

		const tokenBalance = await tokenContract.balanceOf(userAddress);
		document.getElementById('tokenBalance').innerText = ethers.formatUnits(
			tokenBalance,
			decimals,
		);
	} catch (err) {
		console.error('Balance error:', err);
	}
}

// create campaign
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
		await loadCampaigns();
	} catch (err) {
		console.error('Create campaign error:', err);
		alert('Error creating campaign. Check console.');
	}
}

// contribute eth
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
		alert('Transaction sent. Awaiting confirmation...');
		await tx.wait();
		alert('Success! ETH sent, tokens credited.');
		await updateBalances();
		await loadCampaigns();
	} catch (err) {
		console.error('Transaction error:', err);
		alert('Transaction error. Check console.');
	}
}

// faucet tokens
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
		let decimals = 18;
		try {
			decimals = await tokenContract.decimals();
		} catch {}
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

// withdraw funds
async function withdrawFunds() {
	const campaignId = document.getElementById('campaignId').value;
	if (!campaignId) {
		alert('Enter campaign ID');
		return;
	}

	try {
		const tx = await fundContract.withdraw(campaignId);
		alert('Withdraw transaction sent');
		await tx.wait();
		alert('Funds collected');
		await updateBalances();
		await loadCampaigns();
	} catch (err) {
		console.error('Withdraw error:', err);
		alert('Withdraw failed');
	}
}

// refund funds
async function refundFunds() {
	const campaignId = document.getElementById('campaignId').value;
	if (!campaignId) {
		alert('Enter campaign ID');
		return;
	}

	try {
		const tx = await fundContract.refund(campaignId);
		alert('Refund transaction sent');
		await tx.wait();
		alert('Refund successful');
		await updateBalances();
		await loadCampaigns();
	} catch (err) {
		console.error('Refund error:', err);
		alert('Refund failed');
	}
}

// finalize campaign
async function finalizeCampaign(campaignId) {
	try {
		const tx = await fundContract.finalizeCampaign(campaignId);
		alert('Finalize transaction sent...');
		await tx.wait();
		alert('Campaign finalized');
		await loadCampaigns();
	} catch (err) {
		console.error('Finalize error:', err);
		alert('Failed to finalize campaign');
	}
}

// load and display all campaigns
async function loadCampaigns() {
	try {
		const count = await fundContract.campaignCount();
		const container = document.getElementById('campaignList');
		container.innerHTML = '';

		for (let i = 1; i <= count; i++) {
			const campaign = await fundContract.campaigns(i);

			const creator = campaign[0];
			const title = campaign[1];
			const goal = campaign[2];
			const deadline = campaign[3];
			const raised = campaign[4];
			const finalized = campaign[5];
			const successful = campaign[6];

			// skip non-existing campaigns
			if (creator === '0x0000000000000000000000000000000000000000') continue;

			const now = Math.floor(Date.now() / 1000);
			const isExpired = now >= Number(deadline);

			const div = document.createElement('div');
			div.className = 'campaign';

			div.innerHTML = `
                <h4>ID: ${i}</h4>
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Creator:</strong> ${creator}</p>
                <p><strong>Goal:</strong> ${ethers.formatEther(
									goal || 0,
								)} ETH</p>
                <p><strong>Raised:</strong> ${ethers.formatEther(
									raised || 0,
								)} ETH</p>
                <p><strong>Deadline:</strong> ${new Date(
									Number(deadline) * 1000,
								).toLocaleString()}</p>
                <p><strong>Status:</strong> ${
									finalized
										? successful
											? 'Successful'
											: 'Failed'
										: isExpired
										? 'Ready to finalize'
										: 'Active'
								}</p>
                ${
									!finalized && isExpired
										? `<button onclick="finalizeCampaign(${i})">Finalize</button>`
										: ''
								}
            `;

			container.appendChild(div);
		}
	} catch (err) {
		console.error('Load campaigns error:', err);
	}
}

// button event bindings
document.getElementById('connectButton').onclick = connect;
document.getElementById('sendButton').onclick = contribute;
document.getElementById('createButton').onclick = createCampaign;
document.getElementById('faucetButton').onclick = faucetTokens;
document.getElementById('withdrawButton').onclick = withdrawFunds;
document.getElementById('refundButton').onclick = refundFunds;
document.getElementById('refreshCampaigns').onclick = loadCampaigns;

// reload on network/account change
if (window.ethereum) {
	window.ethereum.on('chainChanged', () => window.location.reload());
	window.ethereum.on('accountsChanged', () => window.location.reload());
}
