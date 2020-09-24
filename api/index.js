/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { getContractAndGateway } = require('../../helper/api');

const WALLET_PATH = path.join(__dirname, '..', '..', '..', 'wallet');

async function create({
	type,
	data,
	chaincode,
	key,
	user,
}) {
	// Submit the specified transafalsection.
	/* eslint-disable-next-line no-async-promise-executor */ /* eslint-disable-next-line no-undef */
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);

		if (!contract || !gateway) return;
		
		// submit transaction
		const rawWorkers = await 
			contract
				.submitTransaction('createJob', type, data, chaincode, key)
				.catch(reject);

		//disconnect
		await gateway.disconnect();

		if (!rawWorkers) return;

		const workers = JSON.parse(rawWorkers.toString('utf8'));
		
		console.log('Transaction has been submitted');
		resolve(workers);
		return;
  });
}

async function list({
	status,
	chaincode,
	key,
	user,
}) {
	// Submit the specified transafalsection.
	/* eslint-disable-next-line no-async-promise-executor */ /* eslint-disable-next-line no-undef */
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);

		if (!contract || !gateway) return;

		var rawJobs, jobs;
		
		// submit transaction
		if(status){
			rawJobs = await
				contract
					.submitTransaction('listJobs', status)
					.catch(reject);
		}

		if(chaincode && key && !status){
			rawJobs = await
				contract
					.submitTransaction('listJobByChaincodeAndKey', chaincode, key)
					.catch(reject);
		}
				
		//disconnect
		await gateway.disconnect();
				
		if (!rawJobs) return;

		jobs = JSON.parse(rawJobs.toString('utf8'));
		console.log('Transaction has been submitted');

		resolve(jobs);
		return;
  });
}

async function get({
	jobId,
	user,
}) {
	// Submit the specified transafalsection.
	/* eslint-disable-next-line no-async-promise-executor */ /* eslint-disable-next-line no-undef */
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);

		if (!contract || !gateway) return;
		
		// submit transaction
		const rawJob = await 
			contract
				.submitTransaction('getJob', jobId)
				.catch(reject);
				
		//disconnect
		await gateway.disconnect();

		if (!rawJob) return;

		const job = JSON.parse(rawJob.toString('utf8'));

		console.log('Transaction has been submitted');
		resolve(job);
		return;
    });
}

async function complete({
	jobId,
	result,
	user,
}) {
	/* eslint-disable-next-line no-async-promise-executor */ /* eslint-disable-next-line no-undef */
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		const {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'job', contract: 'Job'})
				.catch(reject);

		if (!contract || !gateway) return;
		
		// submit transaction
		const transaction = await 
			contract
				.submitTransaction('completeJob', jobId, result)
				.catch(reject);
		
		//disconnect
		await gateway.disconnect();

		if (!transaction) return;
		console.log('Transaction has been submitted');
		resolve();
		return;
    });
}

module.exports = {
	create,
	list,
	complete,
	get,
};