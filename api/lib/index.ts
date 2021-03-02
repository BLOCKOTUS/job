import fs from 'fs';
import path from 'path';

import { getContractAndGateway } from '../../../helper/api/dist/index.js';

const WALLET_PATH = path.join(__dirname, '..', '..', '..', '..', 'wallet');

/**
 * Creates a job on the network.
 * Each job contain `data` and refers to a `chaincode` and a `key`.
 */
export const create = async ({
  type,
  data,
  chaincode,
  key,
  user,
}) => {
  // Submit the specified transafalsection.
  return new Promise(async (resolve, reject) => {
    // create wallet
    const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
    fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

    // get contract, submit transaction and disconnect
    const {contract, gateway} = await
      getContractAndGateway({user, chaincode: 'job', contract: 'Job'})
        .catch(reject);

    if (!contract || !gateway) { return; }

    // submit transaction
    const rawWorkers = await
      contract
        .submitTransaction('createJob', type, data, chaincode, key)
        .catch(reject);

    // disconnect
    await gateway.disconnect();

    if (!rawWorkers) { return; }

    const workers = JSON.parse(rawWorkers.toString('utf8'));

    resolve(workers);
    return;
  });
};

/**
 * List jobs attributed to the user.
 * They can be filtered by `status`, `chaincode`, and `key`.
 */
export const list = async ({
  status,
  chaincode,
  key,
  user,
}) => {
  // Submit the specified transafalsection.
  return new Promise(async (resolve, reject) => {
    // create wallet
    const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
    fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

    // get contract, submit transaction and disconnect
    const {contract, gateway} = await
      getContractAndGateway({user, chaincode: 'job', contract: 'Job'})
        .catch(reject);

    if (!contract || !gateway) { return; }

    let rawJobs;
    let jobs;

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

    // disconnect
    await gateway.disconnect();

    if (!rawJobs) { return; }

    jobs = JSON.parse(rawJobs.toString('utf8'));
    resolve(jobs);
    return;
  });
};

/**
 * Get a job from the network, by `jobId`.
 */
export const get = async ({
  jobId,
  user,
}) => {
  // Submit the specified transafalsection.
  return new Promise(async (resolve, reject) => {
    // create wallet
    const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
    fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

    // get contract, submit transaction and disconnect
    const {contract, gateway} = await
      getContractAndGateway({user, chaincode: 'job', contract: 'Job'})
        .catch(reject);

    if (!contract || !gateway) { return; }

    // submit transaction
    const rawJob = await
      contract
        .submitTransaction('getJob', jobId)
        .catch(reject);

    // disconnect
    await gateway.disconnect();

    if (!rawJob) { return; }

    const job = JSON.parse(rawJob.toString('utf8'));
    resolve(job);
    return;
    });
};

/**
 * Complete a job on the network.
 * It will mark the job as `complete` and post the `result` on the network.
 */
export const complete = async ({
  jobId,
  result,
  user,
}) => {
  return new Promise(async (resolve, reject) => {
    // create wallet
    const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
    fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

    // get contract, submit transaction and disconnect
    const {contract, gateway} = await
      getContractAndGateway({user, chaincode: 'job', contract: 'Job'})
        .catch(reject);

    if (!contract || !gateway) { return; }

    // submit transaction
    const transaction = await
      contract
        .submitTransaction('completeJob', jobId, result)
        .catch(reject);

    // disconnect
    await gateway.disconnect();

    if (!transaction) { return; }
    resolve();
    return;
    });
};
