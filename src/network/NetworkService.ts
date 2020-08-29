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
import { NetworkDriver, MessageData } from "../driver/NetworkDriver";
import { Logger } from "tslog";


let logger: Logger = new Logger({name: 'network-service'});


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

	private _nodes_last_changed: {[id:number]: number} = {};
	private _values_last_changed: {[id: string]: number} = {};

	protected _on_node(topic: string, data: MessageData) {
		logger.info(`network handle node message on topic '${topic}'`);

		switch (topic.toLocaleLowerCase()) {

			case "add": this._onNodeAdd(data); break;
			case "available": this._onNodeAvailable(data); break;
			case "ready": this._onNodeReady(data); break;
			case "remove": this._onNodeRemove(data); break;
			default:
				logger.warn(`network handle unknown node state '${topic}'`);
				break;
		}
	}

	protected _on_value(topic: string, data: MessageData) {
		logger.info(`network handle value message on topic '${topic}'`);
	}


	private _onNodeAdd(data: MessageData) {
		logger.debug("nodeadd payload: ", data.payload);
		logger.debug(`network: add node id ${data.payload['id']}`)
		let nodeid: number = data.payload['id'];
		if (nodeid <= 0) {
			logger.warn(`unexpected node id: ${nodeid}`);
			return;
		}
		if (nodeid in this._nodes) {
			logger.debug(`node ${nodeid} already tracked; check dup?`);
			if (!(nodeid in this._nodes_last_changed)) {
				throw Error("expected node's last change to have been tracked");
			}
			if (data.timestamp <= this._nodes_last_changed[nodeid]) {
				logger.debug("dup! drop.");
				return;
			} else {
				logger.debug("not a dup; must have restarted!");
			}
		}
		let payload = data.payload;
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
		this._nodes_last_changed[nodeid] = data.timestamp;
	}

	private _onNodeAvailable(data: MessageData) {
		let nodeid: number = data.payload['id'];
		if (!nodeid) {
			logger.error("undefined nodeid??!");
			logger.error("payload: ", data.payload);
			throw new Error("undefined node id??");
		}
		logger.debug(`network: node ${nodeid} is available`);
		if (!(nodeid in this._nodes) || 
			(nodeid in this._nodes_last_changed &&
			data.timestamp <= this._nodes_last_changed[nodeid])) {
			// this might be a stray message; drop it.
			logger.debug("dropping assumed stray");
			return;
		}
		let info_data: {[id: string]: any} = data.payload['info'];
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
		this._nodes_last_changed[nodeid] = data.timestamp;
	}

	private _onNodeReady(data: MessageData) {
		let nodeid: number = data.payload['id'];
		logger.debug(`network: node ${nodeid} is ready`);
		if (!(nodeid in this._nodes) || 
		    (nodeid in this._nodes_last_changed &&
		     data.timestamp <= this._nodes_last_changed[nodeid])) {
			logger.debug("dropping assumed stray");
			return;
		}
		this._nodes[nodeid].ready = true;
		this._nodes[nodeid].last_seen = new Date().toISOString();
		
	}

	private _onNodeRemove(data: MessageData) {
		let nodeid: number = data.payload['id'];
		logger.debug(`network: node ${nodeid} has been removed`);
		if (!(nodeid in this._nodes) || 
		    (nodeid in this._nodes_last_changed &&
		     data.timestamp <= this._nodes_last_changed[nodeid])) {
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