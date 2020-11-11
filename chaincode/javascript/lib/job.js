/*
* SPDX-License-Identifier: Apache-2.0
*/

'use strict';

const { Contract } = require('fabric-contract-api');

const PENDING = 'pending';
const COMPLETE = 'complete';

class Job extends Contract {
    // "PRIVATE"

    async initLedger() {

    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    validateParams(params, count) {
        if(params.length !== count) throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`);
    }

    /**
     * Get the creatorId (transaction submitter unique id) from the Helper organ.
     */
    async getCreatorId(ctx) {
        const rawId = await ctx.stub.invokeChaincode("helper", ["getCreatorId"], "mychannel");
        if (rawId.status !== 200) throw new Error(rawId.message);

        return rawId.payload.toString('utf8');
    }

    /**
     * Get the timestamp from the Helper organ.
     */
    async getTimestamp(ctx) {
        const rawTs = await ctx.stub.invokeChaincode("helper", ["getTimestamp"], "mychannel");
        if (rawTs.status !== 200) throw new Error(rawTs.message);

        return rawTs.payload.toString('utf8');
    }

    /**
     * Get the number of confirmations needed for the job type.
     */
    getCountPerType(_type) {
        return "3";
    }

    /**
     * Retrieve a job by `jobId`
     * 
     * @param {Context} ctx
     * @param {JobId} jobId
     */
    async getJobById(ctx, jobId){
        const rawJob = await ctx.stub.getState(jobId);
        if (!rawJob || rawJob.length === 0) throw new Error(`${jobId} does not exist`);

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
    async createCompositeKeyForWorkers(ctx, workersIds, status, jobId) {
        return new Promise((r) => {
            let promisesWorker = workersIds.map(worker => ctx.stub.createCompositeKey('workerId~status~jobId', [worker._id, status, jobId]));
            let promisesJob = workersIds.map(worker => ctx.stub.createCompositeKey('jobId~status~workerId', [jobId, status, worker._id]));
            Promise.all([...promisesWorker, ...promisesJob]).then(r).catch(console.log);
        });
    }

    /**
     * Put an array for compositeKeys in the ledger.
     * 
     * @param {Context} ctx
     * @param {Array<string>} workers
     */
    async putCompositeKeyForWorkers(ctx, workers) {
        return new Promise((r) => {
            let promises = workers.map(i => ctx.stub.putState(i, Buffer.from('\u0000')));
            Promise.all(promises).then(r).catch(console.log);
        });
    }

    /**
     * Retrive results associated with a job.
     * 
     * @param {Context} ctx
     * @param {string} jobId
     */
    async getJobResults(ctx, jobId) {
        var list = []; 
        var formattedResults = {};

        // retrieve matching results
        const results = await ctx.stub.getStateByPartialCompositeKey('jobId~resultId', [jobId]);
        let responseRange = await results.next();

        // construct a list containing `resultId`
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) return formattedResults;
            let splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
            list.push({ resultId: splitedKey.attributes[1] });
            responseRange = await results.next();
        }

        // retrieve all results, and resolve result
        const promises = list.map(l => ctx.stub.getState(l.resultId));
        if(list.length === 0) return formattedResults;
        return new Promise((res, rej) => {
            Promise
                .all(promises)
                .then(resultsValues => {
                    resultsValues.forEach(r => {
                    var resultValue = JSON.parse(r.toString());
                    formattedResults[resultValue.result] ? formattedResults[resultValue.result] = formattedResults[resultValue.result] + 1 : formattedResults[resultValue.result] = 1;
                });
                    res(formattedResults);
                })
                .catch(e => {
                    rej(e);
                    throw new Error(e);
                });
        });
    } 

    // "PUBLIC"

    /**
     * Creates a job.
     * 
     * @param {string} type = 'confirmation'
     * @param {string} data
     * @param {string} chaincode
     * @param {string} key
     */
    async createJob(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 4);

        // construct job object
        const id = await this.getCreatorId(ctx);
        const jobId = `${id}||${await this.getTimestamp(ctx)}`;
        const value = {
            type: params[0],
            data: params[1],
            chaincode: params[2],
            key: params[3],
            creator: id,
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
        const response = await ctx.stub.invokeChaincode("user", ["getNextWorkersIds", count], "mychannel");
        if (response.status !== 200) throw new Error(response.message);
        const workersIds = JSON.parse(response.payload.toString('utf8'));


        // notify workers
        const workers = await this.createCompositeKeyForWorkers(ctx, workersIds, PENDING, jobId);
        await this.putCompositeKeyForWorkers(ctx, workers);

        return {workersIds, jobId};
    }

    /**
     * List jobs.
     * 
     * @param {string} status
     */
    async listJobs(ctx){
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        // get creatorId and status param
        const id = await this.getCreatorId(ctx);
        const status = params[0];

        // retrieve the matching jobs from the ledger
        var list = [];
        const results = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, status]);

        // parse the result, and construct the list
        let responseRange = await results.next();
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) return;
            let splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
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
    async getJob(ctx){
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
    async listJobByChaincodeAndKey(ctx){
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        // get `cretorId`, and `chaincode` and `key` param
        const id = await this.getCreatorId(ctx);
        const chaincode = params[0];
        const key = params[1];

        // retrieve the matching jobs from the ledger
        var list = [];
        const results = await ctx.stub.getStateByPartialCompositeKey('chaincode~key~id~jobId', [chaincode, key, id]);

        // Iterate through result set and for each asset found, transfer to newOwner
        let responseRange = await results.next();
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) return;
            let splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
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
    async completeJob(ctx){
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        // get `creatorId`, and `jobId` and `result` param
        const id = await this.getCreatorId(ctx);
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
        const resultId = `${id}||${params[0]}||${await this.getTimestamp(ctx)}`;
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
}

module.exports = Job;
