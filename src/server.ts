/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { WebHost, Permissions } from '@microsoft/mixed-reality-extension-sdk';
import dotenv from 'dotenv';
import { resolve as resolvePath } from 'path';
import App from './app';

/* eslint-disable no-console */
process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));

// Read .env if file exists
dotenv.config();

// Start listening for connections, and serve static files.
const server = new WebHost({
	baseDir: resolvePath(__dirname, '../public'),
	permissions: [Permissions.UserInteraction, Permissions.UserTracking]
});

// Handle new application sessions
server.adapter.onConnection((context, params) => new App(context, params, server.baseUrl));