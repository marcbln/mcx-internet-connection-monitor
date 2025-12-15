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
 * @class InternetConnectionChecker
 * @description Checks the internet connection by pinging a list of hosts.
 * 10/2020 created
 */
class InternetConnectionChecker {

    isInternetUpLast = null;
    stateSince = null;
    pathLogfile = null;

    /**
     * @constructor
     * @param {string} pathLogfile - The path to the log file.
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
     * Pings all hosts and at least one must be alive to assume that internet is working.
     *
     * @returns {Promise<boolean>} - True if the internet connection is up, false otherwise.
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
     * Pings a single host.
     *
     * @param {string} host - The host to ping.
     * @returns {Promise<boolean>} - True if the host is reachable, false otherwise.
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
     * Checks if internet connection is up and logs to logfile if connection state changed.
     *
     * @returns {Promise<void>}
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

    /**
     * Gets the current date and time as a formatted string.
     * @returns {string} - The formatted date and time.
     * @private
     */
    _getDate() {
        return moment().locale(LOCALE_DATETIME).format('LLL');
    };

    /**
     * Gets the time difference since the last state change in a human-readable format.
     * @returns {string} - The human-readable time difference.
     * @private
     */
    _getTimeDiffHumanReadable() {
        const end = moment()
        return moment.duration(end.diff(this.stateSince)).locale(LOCALE_TIMEDIFF).humanize({ss: 0});
    };

    /**
     * Appends a line to the log file.
     *
     * @param {string} logLine - The line to append to the log.
     * @returns {Promise<void>}
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

    /**
     * Logs that the internet connection is back up.
     * @private
     */
    logInternetIsBack() {
        this._appendToLog(`UP (was down for ${this._getTimeDiffHumanReadable()})`);
    }

    /**
     * Logs that the internet connection went down.
     * @private
     */
    logInternetWentDown() {
        this._appendToLog(`DOWN (was up for ${this._getTimeDiffHumanReadable()})`);
    }
}


// ---- MAIN

const checker = new InternetConnectionChecker(process.argv[2] ?? PATH_DEFAULT_LOG);
checker.checkInternetConnection();



