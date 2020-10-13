/*
 * simple tool to log internet up and down times to a log file
 *
 * 10/2020 created
 */


'use strict'
const ping = require('ping');
const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');

const INTERVAL = 1; // seconds
const PATH_DEFAULT_LOG = './internet-connection.log';

const HOSTS = [
    'google.de',
    'amazon.de',
    'netflix.com',
];
const LOCALE_DATETIME = 'de';
const LOCALE_TIMEDIFF = 'en';

/**
 * 10/2020 created
 */
class InternetConnectionChecker {

    isInternetUpLast = null;
    stateSince = null;
    pathLogfile = null;

    /**
     *
     * @param {string} pathLogfile
     */
    constructor(pathLogfile) {
        this.pathLogfile = pathLogfile;
        console.log(`logging to ${this.pathLogfile} ...`);

        if (process.platform === "win32") {
            var rl = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.on("SIGINT", () => {
                process.emit("SIGINT");
            });
        }

        // -- graceful shutdown (add log line)
        process.on("SIGINT", async () => {
            await this._appendToLog(`Exiting internet connection checker, internet is ${this.isInternetUpLast ? 'UP' : 'DOWN'} (for ${this._getTimeDiffHumanReadable()})`);
            process.exit();
        });
    }

    /**
     * pings all hosts and at least one must be alive to assume that internet is working
     *
     * @return {Promise<boolean>}
     */
    async getIsInternetUp() {
        // ---- ping all hosts async
        const promises = [];
        for (const host of HOSTS) {
            promises.push(this.pingPromise(host));
        }
        const results = await Promise.all(promises);
        const wasAtLeastOnePingSuccessful = _.reduce(results, function (sum, n) {
            return sum || n;
        }, false);

        // console.log(results, wasAtLeastOnePingSuccessful);

        return wasAtLeastOnePingSuccessful;
    }


    /**
     *
     * @param {string} host
     * @return {Promise<boolean>}
     */
    pingPromise(host) {
        return new Promise((resolve, reject) => {
            ping.sys.probe(host, (isAlive, err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(isAlive);
                }
            })
        });
    }


    /**
     * checks if internet connection is up .. logs to logfile if connection state changed
     *
     * @return {Promise<void>}
     */
    async checkInternetConnection() {
        const isInternetUp = await this.getIsInternetUp()
        // console.log(`isInternetUp: ${isInternetUp}`);

        if (this.isInternetUpLast === null) {
            // -- this is the first check ...
            this._appendToLog(`Starting internet connection checker (check interval: ${INTERVAL}s), internet is ${isInternetUp ? 'UP' : 'DOWN'}`);
            this.stateSince = moment();
        } else {
            // -- detect state change
            if (!this.isInternetUpLast && isInternetUp) {
                // internet is back
                this.logInternetIsBack();
                this.stateSince = moment();
            } else if (this.isInternetUpLast && !isInternetUp) {
                // we went offline
                this.logInternetWentDown();
                this.stateSince = moment();
            }
        }
        this.isInternetUpLast = isInternetUp;

        // ---- schedule next check
        setTimeout(() => {
            this.checkInternetConnection();
        }, INTERVAL * 1000);

    }

    _getDate() {
        return moment().locale(LOCALE_DATETIME).format('LLL');
    };

    _getTimeDiffHumanReadable() {
        const end = moment()
        return moment.duration(end.diff(this.stateSince)).locale(LOCALE_TIMEDIFF).humanize({ss: 0});
    };

    /**
     *
     * @param logLine
     * @return {Promise<void>}
     * @private
     */
    _appendToLog(logLine) {
        return new Promise((resolve, reject) => {
            const line = this._getDate() + " - " + logLine;
            console.log(line);
            fs.appendFile(PATH_DEFAULT_LOG, line + "\n", err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    logInternetIsBack() {
        this._appendToLog(`UP (was down for ${this._getTimeDiffHumanReadable()})`);
    }

    logInternetWentDown() {
        this._appendToLog(`DOWN (was up for ${this._getTimeDiffHumanReadable()})`);
    }
}


// ---- MAIN

const checker = new InternetConnectionChecker(process.argv[2] ?? PATH_DEFAULT_LOG);
checker.checkInternetConnection();



