/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */

import { Logger } from "tslog";

import { RegisterRoutes } from '../tsoa/routes';
import swaggerUi from 'swagger-ui-express';
import express, {
	Response as ExResponse, Request as ExRequest
} from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import { ConfigItem, ConfigService } from "../ConfigService";
import { Server } from "http";



let logger: Logger = new Logger({name: "http-driver"});


export class HTTPDriver {

	private static instance: HTTPDriver;
	private constructor() {
		this.httpApp.use(cors());
		this.httpApp.use(bodyParser.urlencoded({extended: true}));
		this.httpApp.use(bodyParser.json());
		this.httpApp.use("/docs", swaggerUi.serve,
			async (_req: ExRequest, res: ExResponse) => {
				let swaggerstr = fs.readFileSync("./src/tsoa/swagger.json");
				return res.send(
					swaggerUi.generateHTML(JSON.parse(swaggerstr.toString()))
				);
		});
		RegisterRoutes(this.httpApp);
	}
	public static getInstance(): HTTPDriver {
		if (!HTTPDriver.instance) {
			HTTPDriver.instance = new HTTPDriver();
		}
		return HTTPDriver.instance;
	}

	private httpApp = express();
	private httpServer?: Server = undefined;

	startup(): boolean {
		logger.info("starting up http driver");

		let config: ConfigItem = ConfigService.getConfig();
		let host: string = config.server.host;
		let port: number = config.server.port;
		this.httpServer = this.httpApp.listen( port, host,  err => {
			if (err) {
				logger.error("unable to start http server:", err);
				return false;
			} else {
				logger.info(`http server running on port ${port}`);
			}
		});

		return true;
	}

	shutdown(): void {
		logger.info("shutting down http driver");
		this.httpServer?.close();
	}
}