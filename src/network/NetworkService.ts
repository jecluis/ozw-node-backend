/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */

import { NodeItem, NodeInfoItem, NodeItemState } from "../types/Nodes";
import { ValueItem } from "../types/Values";
import { MQTTDriver, MqttDriverMessage } from "../driver/MQTTDriver";
import { NetworkDriver } from "../driver/NetworkDriver";
import { Logger } from "tslog";


let logger: Logger = new Logger({name: 'network-service'});

declare type MessagePayload = {[id: string]: any};

// XXX: for us to be able to provide more information, the required information,
// the mqtt gateway needs to send out a few more events for each node,
// especially about the node's capabilities.

/**
 * Network Service
 * 
 * Extends the Network Driver class, which will in turn interface with the MQTT
 * Driver and provide abstractions to things we really don't particularly care
 * (like mqtt namespaces). In theory, we could implement this so that we could
 * have multiple drivers, or one single driver, handling multiple mqtt
 * namespaces into one single network.
 * 
 * We will keep information about nodes, and their values, to be provided to
 * consumers such as the REST API.
 */
 export class NetworkService extends NetworkDriver {

	private static instance: NetworkService;
	private constructor() {
		super();
	}
	public static getInstance(): NetworkService {
		if (!NetworkService.instance) {
			throw new Error("service used before being initialized");
		}
		return NetworkService.instance;
	}

	public static init(): void {
		if (!NetworkService.instance) {
			NetworkService.instance = new NetworkService();
		}
	}

	private _driver: MQTTDriver = MQTTDriver.getInstance();

	private _nodes: NodeItem[] = [];
	private _values_per_node: {[id:number]: ValueItem} = {}
	private _values_per_class: {[id:number]: ValueItem} = {}
	private _values_per_id: {[id:string]: ValueItem} = {}

	protected _on_node(topic: string, payload: {[id: string]: any}) {
		logger.info(`network handle node message on topic '${topic}'`);

		switch (topic.toLocaleLowerCase()) {

			case "add": this._onNodeAdd(payload); break;
			case "available": this._onNodeAvailable(payload); break;
			case "ready": this._onNodeReady(payload); break;
			case "remove": this._onNodeRemove(payload); break;
			default:
				logger.warn(`network handle unknown node state '${topic}'`);
				break;
		}
	}

	protected _on_value(topic: string, payload: MessagePayload) {
		logger.info(`network handle value message on topic '${topic}'`);
	}


	private _onNodeAdd(payload: MessagePayload) {
		logger.debug(`network: add node id ${payload['id']}`)
		let nodeid: number = payload['id'];
		if (nodeid <= 0) {
			logger.warn(`unexpected node id: ${nodeid}`);
			return;
		}
		if (nodeid in this._nodes) {
			logger.debug(`node ${nodeid} already tracked; drop dup.`);
			return;
		}
		let node: NodeItem = {
			id: payload['id'],
			info: {
				manufacturer: "",
				manufacturerid: "",
				product: "",
				producttype: "",
				productid: "",
				type: "",
				name: "",
				loc: ""
			},
			state: NodeItemState.Nop,
			ready: false,
			caps: {
				is_listening: false,
				is_routing: false,
				is_beaming: false,
				is_controller: false,
				is_primary_controller: false
			},
			class: {
				is_meter: false,
				is_switch: false
			},
			last_seen: new Date().toISOString()
		};
		this._nodes[nodeid] = node;
	}

	private _onNodeAvailable(payload: MessagePayload) {
		let nodeid: number = payload['id'];
		logger.debug(`network: node ${nodeid} is available`);
		if (!(nodeid in this._nodes)) {
			// this might be a stray message; drop it.
			logger.debug("dropping assumed stray");
			return;
		}
		let info_data: {[id: string]: any} = payload['info'];
		let info: NodeInfoItem = {
			manufacturer: info_data['manufacturer'],
			manufacturerid: info_data['manufacturerid'],
			product: info_data['product'],
			producttype: info_data['producttype'],
			productid: info_data['productid'],
			type: info_data['type'],
			name: info_data['name'],
			loc: info_data['loc']
		};
		this._nodes[nodeid].info = info;
		this._nodes[nodeid].last_seen = new Date().toISOString();
	}

	private _onNodeReady(payload: MessagePayload) {
		let nodeid: number = payload['id'];
		logger.debug(`network: node ${nodeid} is ready`);
		if (!(nodeid in this._nodes)) {
			logger.debug("dropping assumed stray");
			return;
		}
		this._nodes[nodeid].ready = true;
		this._nodes[nodeid].last_seen = new Date().toISOString();
	}

	private _onNodeRemove(payload: MessagePayload) {
		let nodeid: number = payload['id'];
		logger.debug(`network: node ${nodeid} has been removed`);
		if (!(nodeid in this._nodes)) {
			// nothing to do.
			return;
		}
		delete this._nodes[nodeid];
	}

	getNodes(): NodeItem[] {
		return Object.values(this._nodes);
	}

	getNode(nodeid: number): NodeItem {
		if (!(nodeid in this._nodes)) {
			throw new Error("no such node");
		}
		return this._nodes[nodeid];
	}
 }