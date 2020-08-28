/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */
import { Logger } from 'tslog';
import { ConfigService } from './ConfigService';
import { EINVAL } from 'constants';
import { MQTTDriver, MqttDriverMessage } from './driver/MQTTDriver';
import { HTTPDriver } from './driver/HTTPDriver';
import { NetworkService } from './network/NetworkService';


let logger: Logger = new Logger({name: "ozw-backend"});

// attempt to load configuration file.
// XXX: this should be configurable from the command line, but we are not
// dealing with that right now.
//let conffile = './backend-config.json'
let conffile = undefined;
let config: ConfigService;
try {
	config = ConfigService.getInstance(conffile);
} catch (e) {
	logger.error(`error loading config file at '${conffile}`);
	process.exit(EINVAL);
}

logger.info("using config: ", config.getConfig());


// setup mqtt driver
let mqtt_driver: MQTTDriver = MQTTDriver.getInstance();

// setup http driver
let http_driver: HTTPDriver = HTTPDriver.getInstance();


async function startup() {
	logger.info("starting up...");
	logger.info("start mqtt driver");
	let success = mqtt_driver.startup();
	if (!success) {
		logger.error("unable to start mqtt driver");
		process.exit(1);
	}

	logger.info("waiting for mqtt driver to become available...");
	while (!mqtt_driver.isConnected() && !mqtt_driver.isFailed()) {
		await sleep(1000); // wait for half a second.
	}

	if (mqtt_driver.isFailed()) {
		logger.error("mqtt driver startup failed:", mqtt_driver.getFailedMsg());
		process.exit(1);
	}

	logger.info("mqtt driver started up and connected");

	mqtt_driver.subscribe("ozw/#");
	mqtt_driver.on_message("ozw/#", (msg: MqttDriverMessage) => {
		logger.debug(
			`got message on topic ${msg.topic}, payload:`, msg.payload);
	})

	logger.info("start http driver");
	http_driver.startup();

	/* inititate services
	 *
	 * these use the drivers internally, obtaining their singletons directly, so
	 * we don't need to pass anything to them. They are singletons themselves;
	 * we're just initiating them so that we are in control of when they are
	 * properly instantiated, given one can't use a service without the drivers
	 * being already setup.
	 */
	logger.info("create services");
	// network service
	NetworkService.init();
}

function shutdown() {
	logger.info("shutting down...");
	mqtt_driver.shutdown();
	http_driver.shutdown();
}

async function sleep(ms: number) {
	return new Promise( (resolve) => {
		setTimeout(resolve, ms);
	});
}

let keep_looping: boolean = true;
process.on('SIGINT', () => {
	keep_looping = false;
});


async function main() {
	logger.info("starting backend");

	startup();

	logger.info("started up, loop.");
	while (keep_looping) {
		await sleep(1000);
	}

	shutdown();
	logger.info("stopping.");
}

main();