/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

const PENDING = 'pending';
const COMPLETE = 'complete';

class Job extends Contract {

    async initLedger(ctx) {
      
    }

    validateParams(params, count) {
        if(params.length !== count) throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`);
    }

    async getCreatorId(ctx) {
        const rawId = await ctx.stub.invokeChaincode("helper", ["getCreatorId"], "mychannel");
        if (rawId.status !== 200) throw new Error(rawId.message);
        
        return rawId.payload.toString('utf8');
    }

    async getTimestamp(ctx) {
        const rawTs = await ctx.stub.invokeChaincode("helper", ["getTimestamp"], "mychannel");
        if (rawTs.status !== 200) throw new Error(rawId.message);
        
        return rawTs.payload.toString('utf8');
    }

    getCountPerType(type) {
        return "3";
    }

    async createCompositeKeyForWorkers(ctx, workersIds, status, jobId) {
        return new Promise((r) => {
            let promisesWorker = workersIds.map(worker => ctx.stub.createCompositeKey('workerId~status~jobId', [worker._id, status, jobId]));
            let promisesJob = workersIds.map(worker => ctx.stub.createCompositeKey('jobId~status~workerId', [jobId, status, worker._id]));
            Promise.all([...promisesWorker, ...promisesJob]).then(r).catch(console.log)
        })
    }

    async putCompositeKeyForWorkers(ctx, workers) {
        return new Promise((r) => {
            let promises = workers.map(i => ctx.stub.putState(i, Buffer.from('\u0000')));
            Promise.all(promises).then(r).catch(console.log)
        })
    }
    
    // @ params[0]: type = 'confirmation'
    // @ params[1]: data
    // @ params[2]: chaincode
    // @ params[3]: key
    async createJob(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 4);

        const id = await this.getCreatorId(ctx);
        const jobId = `${id}||${await this.getTimestamp(ctx)}`;

        const value = {
            type: params[0],
            data: params[1],
            chaincode: params[2],
            key: params[3],
            creator: id
        }

        await ctx.stub.putState(jobId, Buffer.from(JSON.stringify(value)));
        
        const indexCreator = await ctx.stub.createCompositeKey('id~jobId', [id, jobId]);
        await ctx.stub.putState(indexCreator, Buffer.from('\u0000'));
        

        // select workers
        const count = this.getCountPerType(params[0]);
        const response = await ctx.stub.invokeChaincode("user", ["getNextWorkersIds", count], "mychannel");
        if (response.status !== 200) throw new Error(response.message);
        const workersIds = JSON.parse(response.payload.toString('utf8'));
        
        console.log('====== workersIds count ========', workersIds.length);
        
        // notify them
        const workers = await this.createCompositeKeyForWorkers(ctx, workersIds, PENDING, jobId);
        await this.putCompositeKeyForWorkers(ctx, workers);

        console.info(`=== created ${JSON.stringify(value)} ===`);
        
        return {workersIds, jobId};
    }

    // params[0]: status
    async listJobs(ctx){
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const id = await this.getCreatorId(ctx);
        const status = params[0];

        var list = [];
        const results = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, status]);
        
        // Iterate through result set and for each asset found, transfer to newOwner
		let responseRange = await results.next();
		while (!responseRange.done) {
			if (!responseRange || !responseRange.value || !responseRange.value.key) {
				return;
            }
            
            let splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key)
            
			list.push({jobId: splitedKey.attributes[2], status: splitedKey.attributes[1]});

			responseRange = await results.next();
		}

        return list;
    }

    // params[0]: jobId
    async getJob(ctx){
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const jobId = params[0];

        console.log('==== get jobId ====', jobId)

        const rawJob = await ctx.stub.getState(jobId);

        const job = rawJob.toString();

        console.log('==== job: ====', JSON.stringify(job))

        
        return job;
    }

    // params[0]: jobId
    // params[1]: result
    async completeJob(ctx){
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const id = await this.getCreatorId(ctx);
        const jobId = params[0];
        const result = params[1];

        // verify that the creator has this jobId assigned
        const existing = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, PENDING, jobId]);
        if(existing.response.results.length === 0) throw new Error(`${jobId} is not assigned to the creator.`);

        // delete pending task
        const indexToDeleteWorker = await ctx.stub.createCompositeKey('workerId~status~jobId', [id, PENDING, jobId]);
        await ctx.stub.putState(indexToDeleteWorker, null);

        const indexToDeleteJob = await ctx.stub.createCompositeKey('jobId~status~workerId', [jobId, PENDING, id]);
        await ctx.stub.putState(indexToDeleteJob, null);

        // complete job
        const value = {result, jobId, workerId: id};
        const resultId = `${id}||${params[0]}||${await this.getTimestamp(ctx)}`;

        await ctx.stub.putState(resultId, Buffer.from(JSON.stringify(value)));

        const indexCreator = await ctx.stub.createCompositeKey('workerId~status~jobId', [id, COMPLETE, jobId]);
        await ctx.stub.putState(indexCreator, Buffer.from('\u0000'));

        const indexJob = await ctx.stub.createCompositeKey('jobId~status~workerId', [jobId, COMPLETE, id]);
        await ctx.stub.putState(indexJob, Buffer.from('\u0000'));

        const indexResult = await ctx.stub.createCompositeKey('jobId~resultId', [jobId, resultId]);
        await ctx.stub.putState(indexResult, Buffer.from('\u0000'));
    }
}

module.exports = Job;
