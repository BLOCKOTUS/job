/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { getContractAndGateway } = require('../../../../helper/fabric/helper/javascript');

async function create({
	type,
	data,
	chaincode,
	key,
	user
}) {
	// Submit the specified transafalsection.
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);
		
		// submit transaction
		const rawWorkers = await 
			contract
				.submitTransaction('createJob', type, data, chaincode, key)
				.catch(reject);

		const workers = JSON.parse(rawWorkers.toString('utf8'))
		console.log('Transaction has been submitted');

		//disconnect
		await gateway.disconnect();

		resolve(workers);
		return;
    })
}

async function list({
	status,
	user
}) {
	// Submit the specified transafalsection.
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);
		
		// submit transaction
		const rawJobs = await 
			contract
				.submitTransaction('listJobs', status)
				.catch(reject);

		const jobs = JSON.parse(rawJobs.toString('utf8'))
		console.log('Transaction has been submitted');
		
		//disconnect
		await gateway.disconnect();

		resolve(jobs);
		return;
    })
}

async function get({
	jobId,
	user
}) {
	// Submit the specified transafalsection.
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);
		
		// submit transaction
		const rawJob = await 
			contract
				.submitTransaction('getJob', jobId)
				.catch(reject);
				
		const job = JSON.parse(rawJob.toString('utf8'))
		console.log('Transaction has been submitted');
		
		//disconnect
		await gateway.disconnect();

		resolve(job);
		return;
    })
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
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
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