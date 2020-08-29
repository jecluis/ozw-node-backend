/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */

import { MQTTDriver, MqttDriverMessage } from "./MQTTDriver";
import { ConfigService } from "../ConfigService";
import { Logger } from "tslog";


let logger: Logger = new Logger({name: "network-driver"});


export declare type MessagePayload = {[id: string]: any};

export interface MessageData {
	payload: MessagePayload;
	timestamp: number;
}

/**
 * Network Driver
 * 
 * Interfaces with the MQTT Driver, abstracting namespaces, so that our
 * consumers can focus on handling network events rather than caring on which
 * namespace they are happening.
 * 
 * This also frees the MQTT Driver to handle multiple network namespaces, should
 * the need arise, or having other consumers of the MQTT Driver dealing with
 * namespaces not pertaining to the network itself (e.g., control namespaces for
 * configuration).
 * 
 * This class will not be a singleton, and is meant to be extended by a single
 * service.
 */
 export abstract class NetworkDriver {

	private _mqtt: MQTTDriver = MQTTDriver.getInstance();

	constructor() {
		this._initHandlers();
	}

	private _initHandlers() {
		logger.info("network driver: initialize handlers");
		this._mqtt.on_message(
			this.getNS()+"/node/#",
			this._on_message.bind(this));
		this._mqtt.on_message(
			this.getNS()+"/value/#",
			this._on_message.bind(this));

		// XXX: also needs to catch notifications for dead nodes.
	}

	private _on_message(msg: MqttDriverMessage) {
		let ns: string = this.getNS();
		if (!msg.topic.startsWith(ns+"/")) {
			logger.debug(
				`drop message with topic '${msg.topic}' on ns '${ns}'`);
			return;
		}

		let len: number = `${ns}/`.length;
		let topic: string = msg.topic.substring(len);
		logger.debug(`handle msg topic ${topic} on ns '${ns}'`);

		let msg_payload = msg.payload;
		if (!('payload' in msg_payload)) {
			// malformed message. We expect a 'payload' entry to exist in the
			// message's payload.
			logger.warn(
				`malformed message on topic ${msg.topic}: `, msg_payload);
			return;
		}

		let payload = msg_payload['payload'];
		let timestamp = msg_payload['timestamp'];
		let msg_data: MessageData = {
			payload: payload,
			timestamp: timestamp
		}

		if (topic.startsWith("node/")) {
			len = "node/".length;
			topic = topic.substring(len);
			this._on_node(topic, msg_data);

		} else if (topic.startsWith("value/")) {
			len = "value/".length;
			topic = topic.substring(len);
			this._on_value(topic, msg_data);

		} else {
			logger.warn(`unknown topic '${topic}`);
		}
	}

	protected abstract _on_node(
		topic: string,
		data: MessageData): void;

	protected abstract _on_value(
		topic: string,
		data: MessageData): void;


	// for now, and until we actually require something more convoluted, lets
	// rely on the mqtt driver's config for namespace.
	public getNS(): string {
		return ConfigService.getConfig().mqtt.namespace;
	}
 }