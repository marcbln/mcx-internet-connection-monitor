# mcx-internet-connection-monitor 

## About

mcx-internet-connection-monitor is a simple script written in nodejs. It logs internet up and down times to a log file.

## How it works

It detects internet up and down times by pinging multiple servers. If ALL of these pings fail it assumes that the 
internet connection is down. If any of these pings succeeds it assumes internet connection is working. 


## Installation

    npm install

or 

    yarn install



## Starting the Script

    npm start
        
or 

    yarn start
        
both commands log to `./internet-connection.log`. Alternatively you can pass the path to the logfile as a parameter, eg:

    node index.js /var/log/internet-connection.log



## Stopping the Script

press `Ctrl-C`

## Configuration

You can configure the script by editing the following constants in `index.js`:

- `INTERVAL`: The interval in seconds at which to check the internet connection. The default is 1 second.
- `HOSTS`: An array of hosts to ping. The script will consider the internet connection to be up if at least one of these hosts is reachable. The default hosts are `google.de`, `amazon.de`, and `netflix.com`.



## Author

Marc Christenfeldt



## License

GPL V3 or later
