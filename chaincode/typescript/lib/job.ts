/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context, Contract } from 'fabric-contract-api';

const PENDING = 'pending';
const COMPLETE = 'complete';

export class Job extends Contract {

    public async initLedger() {
        console.log('initLedger');
    }

    // @ params[0]: type = 'confirmation'
    // @ params[1]: data
    // @ params[2]: chaincode
    // @ params[3]: key
    public async createJob(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 4);

        const id = await this.getCreatorId(ctx);
        const jobId = `${id}||${await this.getTimestamp(ctx)}`;

        const value = {
            chaincode: params[2],
            creator: id,
            data: params[1],
            key: params[3],
            type: params[0],
        };

        await ctx.stub.putState(jobId, Buffer.from(JSON.stringify(value)));

        const indexCreator = await ctx.stub.createCompositeKey('id~jobId', [id, jobId]);
        await ctx.stub.putState(indexCreator, Buffer.from('\u0000'));

        const indexChaincodeKey = await ctx.stub.createCompositeKey(
            'chaincode~key~id~jobId',
            [params[2], params[3], id, jobId],
        );
        await ctx.stub.putState(indexChaincodeKey, Buffer.from('\u0000'));

        // select workers
        const count = this.getCountPerType(params[0]);
        const response = await ctx.stub.invokeChaincode('user', ['getNextWorkersIds', count], 'mychannel');
        if (response.status !== 200) { throw new Error(response.message); }
        const workersIds = JSON.parse(response.payload.toString());

        console.log('====== workersIds count ========', workersIds.length);

        // notify them
        const workers = await this.createCompositeKeyForWorkers(ctx, workersIds, PENDING, jobId);
        await this.putCompositeKeyForWorkers(ctx, workers);

        console.info(`=== created ${JSON.stringify(value)} ===`);

        return {workersIds, jobId};
    }

    // params[0]: status
    public async listJobs(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const id = await this.getCreatorId(ctx);
        const status = params[0];

        const list = [];
        const results = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, status]);

        let responseRange = await results.next();
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) { return; }

            const splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
            list.push({jobId: splitedKey.attributes[2], status: splitedKey.attributes[1]});

            responseRange = await results.next();
        }

        return list;
    }

    // params[0]: jobId
    public async getJob(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 1);

        const jobId = params[0];
        const job = await this.getJobById(ctx, jobId);

        return job;
    }

    // params[0]: chaincode
    // params[1]: key
    public async listJobByChaincodeAndKey(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const id = await this.getCreatorId(ctx);
        const chaincode = params[0];
        const key = params[1];

        // verify that the creator has this jobId assigned
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

    // params[0]: jobId
    // params[1]: result
    public async completeJob(ctx: Context) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const id = await this.getCreatorId(ctx);
        const jobId = params[0];
        const result = params[1];

        // verify that the creator has this jobId assigned
        const existing = await ctx.stub.getStateByPartialCompositeKey('workerId~status~jobId', [id, PENDING, jobId]);
        if (existing.response.results.length === 0) { throw new Error(`${jobId} is not assigned to the creator.`); }

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

    public async getJobResults(ctx: Context, jobId) {
        const list = [];
        const formattedResults = {};
        const results = await ctx.stub.getStateByPartialCompositeKey('jobId~resultId', [jobId]);
        let responseRange = await results.next();
        while (!responseRange.done) {
            if (!responseRange || !responseRange.value || !responseRange.value.key) { return formattedResults; }

            const splitedKey = await ctx.stub.splitCompositeKey(responseRange.value.key);
            list.push({ resultId: splitedKey.attributes[1] });

            responseRange = await results.next();
        }

        const promises = list.map((l) => ctx.stub.getState(l.resultId));

        if (list.length === 0) { return formattedResults; }

        /* eslint-disable-next-line no-undef */
        return new Promise((res, rej) => {
            /* eslint-disable-next-line no-undef */
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

    private validateParams(params, count) {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    private async getCreatorId(ctx: Context) {
        const rawId = await ctx.stub.invokeChaincode('helper', ['getCreatorId'], 'mychannel');
        if (rawId.status !== 200) { throw new Error(rawId.message); }

        return rawId.payload.toString();
    }

    private async getTimestamp(ctx: Context) {
        const rawTs = await ctx.stub.invokeChaincode('helper', ['getTimestamp'], 'mychannel');
        if (rawTs.status !== 200) { throw new Error(rawTs.message); }

        return rawTs.payload.toString();
    }

    private getCountPerType(type) {
        if (type) { return '3'; }
    }

    private async getJobById(ctx: Context, jobId) {
        const rawJob = await ctx.stub.getState(jobId);
        if (!rawJob || rawJob.length === 0) { throw new Error(`${jobId} does not exist`); }

        const job = rawJob.toString();
        console.log('==== job: ====', JSON.stringify(job));

        return job;
    }

    private async createCompositeKeyForWorkers(ctx: Context, workersIds, status, jobId) {
        /* eslint-disable-next-line no-undef */
        return new Promise((r) => {
            const promisesWorker = workersIds.map((worker) => ctx.stub.createCompositeKey(
                'workerId~status~jobId',
                [worker._id, status, jobId],
            ));
            const promisesJob = workersIds.map((worker) => ctx.stub.createCompositeKey(
                'jobId~status~workerId',
                [jobId, status, worker._id],
            ));
            /* eslint-disable-next-line no-undef */
            Promise.all([...promisesWorker, ...promisesJob]).then(r).catch(console.log);
        });
    }

    private async putCompositeKeyForWorkers(ctx: Context, workers) {
        /* eslint-disable-next-line no-undef */
        return new Promise((r) => {
            const promises = workers.map((i) => ctx.stub.putState(i, Buffer.from('\u0000')));
            /* eslint-disable-next-line no-undef */
            Promise.all(promises).then(r).catch(console.log);
        });
    }
}
