/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const WALLET_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'wallet');
const CCP_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..', 'network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

async function getContractAndGateway({username, contract}) {
	// load the network configuration
	const ccp = JSON.parse(fs.readFileSync(CCP_PATH, 'utf8'));

	// Create a new file system based wallet for managing identities.
	const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

	// Check to see if we've already enrolled the job.
	const identity = await wallet.get(username);
	if (!identity) {
		console.log(`An identity for the job "${username}" does not exist in the wallet`);
		return {};
	}

	// Create a new gateway for connecting to our peer node.
	const gateway = new Gateway();
	await gateway.connect(ccp, { identity, discovery: { enabled: true, asLocalhost: true } });

	// Get the network (channel) our contract is deployed to.
	const network = await gateway.getNetwork('mychannel');

	// Get the contract from the network.
	return {contract: network.getContract('job', contract), gateway};
}

async function create({
	type,
	data,
	chaincode,
	key,
	user
}) {
	// Submit the specified transafalsection.
	try{		
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await getContractAndGateway({username: user.username, contract: 'Job'});
		
		// submit transaction
		const rawWorkers = await contract.submitTransaction('createJob', type, data, chaincode, key);
		const workers = JSON.parse(rawWorkers.toString('utf8'))
		console.log('Transaction has been submitted');

		//disconnect
		await gateway.disconnect();

		return workers;
    }catch(e){ 
		console.log('ERROR: ', e) 
	}
}

async function list({
	status,
	user
}) {
	// Submit the specified transafalsection.
	try{		
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await getContractAndGateway({username: user.username, contract: 'Job'});
		
		// submit transaction
		const rawJobs = await contract.submitTransaction('listJobs', status);
		const jobs = JSON.parse(rawJobs.toString('utf8'))
		console.log('Transaction has been submitted');
		
		//disconnect
		await gateway.disconnect();

		return jobs;
    }catch(e){ 
		console.log('ERROR: ', e) 
	}
}

async function get({
	jobId,
	user
}) {
	// Submit the specified transafalsection.
	try{		
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await getContractAndGateway({username: user.username, contract: 'Job'});
		
		// submit transaction
		const rawJob = await contract.submitTransaction('getJob', jobId);
		const job = JSON.parse(rawJob.toString('utf8'))
		console.log('Transaction has been submitted');
		
		//disconnect
		await gateway.disconnect();

		return job;
    }catch(e){ 
		console.log('ERROR: ', e) 
	}
}

async function complete({
	jobId,
	result,
	user
}) {
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, contract: 'Job'})
				.catch(reject);
		
		// submit transaction
		const transaction = await 
			contract
				.submitTransaction('completeJob', jobId, result)
				.catch(reject);

		console.log('Transaction has been submitted');
		
		//disconnect
		await gateway.disconnect();

		resolve();
		return;
    })
}

module.exports = {
	create,
	list,
	complete,
	get
}