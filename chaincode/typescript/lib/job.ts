/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context } from 'fabric-contract-api';
import { BlockotusContract } from 'hyperledger-fabric-chaincode-helper';

type CreatorId = string;

type JobId = string;

/**
 * Job object, as stored on the ledger.
 */
type JobType = {
    chaincode: string;
    creator: string;
    data: string;
    key: string;
    type: string;
}

/**
 * Status valid for a job.
 */
type JobStatus = 'pending' | 'complete';

/**
 * A worker (a user), as returned by the network.
 */
type Worker = {
    _id: string;
    publicKey: string;
};

type Workers = Array<Worker>;

const PENDING = 'pending';
const COMPLETE = 'complete';

export class Job extends BlockotusContract {

    public async initLedger() {
        console.log('initLedger');
    }

    /**
     * Creates a job.
     * 
     * @param {string} type = 'confirmation'
     * @param {string} data
     * @param {string} chaincode
     * @param {string} key
     */
    public async createJob(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 4);

        // construct job object
        const id: CreatorId = this.getUniqueClientId(ctx);
        const jobId: JobId = `${id}||${this.getTimestamp(ctx)}`;

        const value: JobType = {
            chaincode: params[2],
            creator: id,
            data: params[1],
            key: params[3],
            type: params[0],
        };

        // store job object on the ledger
        await ctx.stub.putState(jobId, Buffer.from(JSON.stringify(value)));

        // create indexes
        const indexCreator = await ctx.stub.createCompositeKey('id~jobId', [id, jobId]);
        const indexChaincodeKey = await ctx.stub.createCompositeKey(
            'chaincode~key~id~jobId',
            [params[2], params[3], id, jobId],
        );
        await ctx.stub.putState(indexCreator, Buffer.from('\u0000'));
        await ctx.stub.putState(indexChaincodeKey, Buffer.from('\u0000'));

        // select workers
        const count = this.getCountPerType(params[0]);
        const response = await ctx.stub.invokeChaincode('user', ['getNextWorkersIds', count], 'mychannel');
        if (response.status !== 200) { throw new Error(response.message); }
        const workersIds = JSON.parse(response.payload.toString());

        // notify workers
        const workersCompositeKeys = await this.createCompositeKeyForWorkers(ctx, workersIds, PENDING, jobId);
        await this.putCompositeKeyForWorkers(ctx, workersCompositeKeys);

        return {workersIds, jobId};
    }

    /**
     * List jobs.
     * 
     * @param {string} status
     */
    public async listJobs(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        // get creatorId and status param
        const id = this.getUniqueClientId(ctx);
        const status = params[0];

        // retrieve the matching jobs from the ledger
        const list = [];
        const results = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, status]);

        // parse the result, and construct the list
        let responseRange = await results.next();
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) { return; }
            const splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
            list.push({jobId: splitedKey.attributes[2], status: splitedKey.attributes[1]});
            responseRange = await results.next();
        }

        return list;
    }

    /**
     * Get a job, by `jobId`
     * 
     * @param {string} jobId
     */
    public async getJob(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        // retrieve the job from the ledger
        const jobId = params[0];
        const job = await this.getJobById(ctx, jobId);

        return job;
    }

    /**
     * List jobs by `chaincode` and `key`.
     * 
     * @param {string} chaincode
     * @param {string} key
     */
    public async listJobByChaincodeAndKey(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        // get `cretorId`, and `chaincode` and `key` param
        const id = this.getUniqueClientId(ctx);
        const chaincode = params[0];
        const key = params[1];

        // retrieve the matching jobs from the ledger
        const list = [];
        const results = await ctx.stub.getStateByPartialCompositeKey('chaincode~key~id~jobId', [chaincode, key, id]);

        // Iterate through result set and for each asset found, transfer to newOwner
        let responseRange = await results.next();
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) { return; }
            const splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
            list.push({jobId: splitedKey.attributes[3]});
            responseRange = await results.next();
        }

        return list;
    }

    /**
     * Complete a job, by sending a `result`.
     * 
     * @param {string} jobId
     * @param {string} result
     */
    public async completeJob(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        // get `creatorId`, and `jobId` and `result` param
        const id = this.getUniqueClientId(ctx);
        const jobId = params[0];
        const result = params[1];

        // verify that the creator has this jobId assigned
        const existing = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, PENDING, jobId]);
        const response = await existing.next();
        if (response.done) { throw new Error(`${jobId} is not assigned to the creator.`); }

        // delete pending task, by putting `null` value to the corresponding indexes
        const indexToDeleteWorker = await ctx.stub.createCompositeKey('workerId~status~jobId', [id, PENDING, jobId]);
        const indexToDeleteJob = await ctx.stub.createCompositeKey('jobId~status~workerId', [jobId, PENDING, id]);
        await ctx.stub.putState(indexToDeleteWorker, null);
        await ctx.stub.putState(indexToDeleteJob, null);

        // construct value object and put it on the ledger
        const value = {result, jobId, workerId: id};
        const resultId = `${id}||${params[0]}||${this.getTimestamp(ctx)}`;
        await ctx.stub.putState(resultId, Buffer.from(JSON.stringify(value)));

        // put an index corresponding the the creatorId and the jobId
        const indexCreator = await ctx.stub.createCompositeKey('workerId~status~jobId', [id, COMPLETE, jobId]);
        const indexJob = await ctx.stub.createCompositeKey('jobId~status~workerId', [jobId, COMPLETE, id]);
        await ctx.stub.putState(indexCreator, Buffer.from('\u0000'));
        await ctx.stub.putState(indexJob, Buffer.from('\u0000'));

        // put an index corresponding the the jobId and the resultId
        const indexResult = await ctx.stub.createCompositeKey('jobId~resultId', [jobId, resultId]);
        await ctx.stub.putState(indexResult, Buffer.from('\u0000'));
    }

    /**
     * Retrive results associated with a job.
     * 
     * @param {Context} ctx
     * @param {string} jobId
     */
    public async getJobResults(ctx: Context, jobId: JobId) {
        const list = [];
        const formattedResults = {};

        // retrieve matching results
        const results = await ctx.stub.getStateByPartialCompositeKey('jobId~resultId', [jobId]);
        let responseRange = await results.next();

        // construct a list containing `resultId`
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) { return formattedResults; }
            const splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
            list.push({ resultId: splitedKey.attributes[1] });
            responseRange = await results.next();
        }

        // retrieve all results, and resolve result
        const promises = list.map((l) => ctx.stub.getState(l.resultId));
        if (list.length === 0) { return formattedResults; }
        return new Promise((res, rej) => {
            Promise
                .all(promises)
                .then((resultsValues) => {
                    resultsValues.forEach((r) => {
                    const resultValue = JSON.parse(r.toString());
                    formattedResults[resultValue.result]
                        ? formattedResults[resultValue.result] = formattedResults[resultValue.result] + 1
                        : formattedResults[resultValue.result] = 1;
                    });
                    res(formattedResults);
                })
                .catch((e) => {
                    rej(e);
                    throw new Error(e);
                });
        });
    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    private validateParams(params: Array<string>, count: number): void {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    /**
     * Get the number of confirmations needed for the job type.
     */
    private getCountPerType(type: string): string {
        if (type) { return '3'; }
    }

    /**
     * Retrieve a job by `jobId`
     * 
     * @param {Context} ctx
     * @param {JobId} jobId
     */
    private async getJobById(ctx: Context, jobId: JobId) {
        const rawJob = await ctx.stub.getState(jobId);
        if (!rawJob || rawJob.length === 0) { throw new Error(`${jobId} does not exist`); }

        const job = rawJob.toString();

        return job;
    }

    /**
     * Construct an array of compositeKeys, for the array of workers and a jobId
     * 
     * @param {Context} ctx
     * @param {Workers} workersIds
     * @param {JobStatus} status
     * @param {JobId} jobId
     */
    private async createCompositeKeyForWorkers(
        ctx: Context, 
        workersIds: Workers, 
        status: JobStatus, 
        jobId: JobId
    ): Promise<Array<string>> {
        return new Promise((r) => {
            const promisesWorker = workersIds.map((worker) => ctx.stub.createCompositeKey(
                'workerId~status~jobId',
                [worker._id, status, jobId],
            ));
            const promisesJob = workersIds.map((worker) => ctx.stub.createCompositeKey(
                'jobId~status~workerId',
                [jobId, status, worker._id],
            ));
            Promise.all([...promisesWorker, ...promisesJob]).then(r).catch(console.log);
        });
    }

    /**
     * Put an array for compositeKeys in the ledger.
     * 
     * @param {Context} ctx
     * @param {Array<string>} workers
     */
    private async putCompositeKeyForWorkers(ctx: Context, workersCompositeKeys: Array<string>): Promise<void[]> {
        return new Promise((r) => {
            const promises = workersCompositeKeys.map((i) => ctx.stub.putState(i, Buffer.from('\u0000')));
            Promise.all(promises).then(r).catch(console.log);
        });
    }
}
