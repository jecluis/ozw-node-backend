/*
 * Copyright (C) 2020  Joao Eduardo Luis <joao@wipwd.dev>
 *
 * This file is part of wip:wd's openzwave dashboard backend (ozw-backend). 
 * ozw-backend is free software: you can redistribute it and/or modify it
 * under the terms of the EUROPEAN UNION PUBLIC LICENSE v1.2, as published by
 * the European Comission.
 */

import {
    Body,
    Controller,
    Get,
    Path,
    Post,
    Query,
    Route,
    SuccessResponse,
} from 'tsoa';
import { NetworkService } from '../network/NetworkService';
import { NodeItem } from '../types/Nodes';


@Route("/api/nodes")
export class NodesController extends Controller {

    network: NetworkService;

    constructor() {
        super();
        this.network = NetworkService.getInstance();
    }

    @Get()
    public async getNodes(): Promise<NodeItem[]> {
        return this.network.getNodes();
    }

    @Get("{nodeId}")
    public async getNode(
        @Path() nodeId: number
    ): Promise<NodeItem> {
        return this.network.getNode(nodeId);
    }
}