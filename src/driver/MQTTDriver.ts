/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */

import mqtt, { MqttClient, Packet } from "mqtt";
import { Logger } from "tslog";
import { ConfigService } from "../ConfigService";


let logger: Logger = new Logger({name: "mqtt-driver"});

export interface MqttDriverMessage {
	topic: string;
	payload: {};
}

export interface TopicItem {
	topic: string;
	cb: CallbackOnMessage;
}

export declare type CallbackOnMessage = (message: MqttDriverMessage) => void


export class MQTTDriver {

	private static instance: MQTTDriver;
	private constructor() { }
	static getInstance() {
		if (!MQTTDriver.instance) {
			MQTTDriver.instance = new MQTTDriver();
		}
		return MQTTDriver.instance;
	}

	private _mqtt?: MqttClient;
	private _is_connected: boolean = false;
	private _is_failed: boolean = false;
	private _is_failed_error: string = "";
	private _callbacks: TopicItem[] = [];


	private _wantsTopic(topic: string, msg_topic: string): boolean {
		
		topic.replace('#', '.*');
		msg_topic.match(topic);
		return !!msg_topic
	}

	private _handleMessage(_topic: string, _payload: Buffer, _packet: Packet) {
		this._callbacks.forEach( (item) => {

			if (!this._wantsTopic(item.topic, _topic)) {
				return;
			}

			logger.debug(`calling callback for topic '${_topic}`)
			let data: string = JSON.parse(_payload.toString());
			item.cb({topic: _topic, payload: data});
		});
	}

	startup(): boolean {
		logger.info("starting up mqtt driver");
		if (this._is_connected) {
			logger.error("unable to start a connected mqtt driver");
			return false;
		}

		let uri = ConfigService.getInstance().getMQTT();
		this._mqtt = mqtt.connect(uri);
		this._mqtt.on("connect", () => {
			logger.info(`mqtt driver connected to ${uri}`);
			this._is_connected = true;
		});
		this._mqtt.on("error", (err) => {
			logger.error("error connecting mqtt driver:", err.message);
			this._is_failed = true;
			this._is_failed_error = err.message;
		});
		this._mqtt.on("message", this._handleMessage.bind(this));
		return true;
	}

	shutdown(): void {
		logger.info("shutting down mqtt driver...");
		if (!!this._mqtt) {
			this._mqtt.end();
		}
	}

	isFailed(): boolean { return this._is_failed; }
	getFailedMsg(): string { return this._is_failed_error; }
	isConnected(): boolean { return this._is_connected; }

	subscribe(topic: string): void {
		this._mqtt?.subscribe(topic);
	}

	on_message(topic: string, cb: CallbackOnMessage) {
		let cb_topic: TopicItem = {
			topic: topic,
			cb: cb
		}
		this._callbacks.push(cb_topic)
	}
 }