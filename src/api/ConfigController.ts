/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */
import { Controller, Get, Route } from 'tsoa';
import { ConfigService } from '../ConfigService';

@Route('/api/config')
export class ConfigController extends Controller {
	@Get('')
	public async config() {
		return ConfigService.getInstance().getConfig();
	}
}