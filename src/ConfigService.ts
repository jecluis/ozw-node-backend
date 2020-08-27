/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */
import { existsSync, readFileSync } from "fs";
import { Logger } from "tslog";
import { ENOENT, ENODATA } from "constants";


let logger: Logger = new Logger({name: "config-service"});


export interface MQTTConfigItem {
	host: string;
	port: number;
	namespace: string;
}

export interface HTTPServerConfigItem {
	host: string;
	port: number;
}


export interface ConfigItem {
	mqtt: MQTTConfigItem;
	server: HTTPServerConfigItem;
}


export class ConfigService {

	private static instance: ConfigService;
	private constructor() { }
	static getInstance(configfile?: string) {
		if (!ConfigService.instance) {
			let inst: ConfigService = new ConfigService();
			if (!!configfile) {
				if (!inst._loadConfig(configfile)) {
					throw new Error("error loading config file");
				}
			}
			ConfigService.instance = inst;
		}
		return ConfigService.instance;
	}

	private _loadConfig(file: string): boolean {
		let err = this._consumeConfigFile(file);
		if (err < 0) {
			switch (err) {
				case -ENOENT:
					logger.error(`config file not found at '${file}`);
					break;
				case -ENODATA:
					logger.error(`config file at '${file} is empty`);
					break
			}
			return false;
		}
		return true;
	}

	private _consumeConfigFile(file: string): number {
		if (!existsSync(file)) {
			return -ENOENT;
		}
		let raw: string = readFileSync(file, 'utf-8');
		if (raw === "") {
			return -ENODATA;
		}
		let loaded_config: ConfigItem = JSON.parse(raw);
		this.config = {...this.config, ...loaded_config};
		return 0;
	}

	// default configuration
	private config: ConfigItem = {
		mqtt: {
			host: "localhost",
			port: 1883,
			namespace: "ozw"
		},
		server: {
			host: "0.0.0.0",
			port: 1337
		}
	};

	public static getConfig() {
		return this.getInstance().getConfig();
	}

	getConfig() {
		return this.config;
	}

	setConfig(config: ConfigItem) {
		this.config = config;
	}

	getMQTT() {
		return `mqtt://${this.config.mqtt.host}:${this.config.mqtt.port}`;
	}

	getNamespace() {
		return this.config.mqtt.namespace;
	}

	getMQTTConfig() {
		return this.config.mqtt;
	}

	getServerConfig() {
		return this.config.server;
	}
}