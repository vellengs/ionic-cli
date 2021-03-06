import chalk from 'chalk';
import { str2num } from '@ionic/cli-framework/utils/string';

import { CommandLineInputs, CommandLineOptions, IonicEnvironment, ServeDetails } from '../definitions';
import { FatalException } from '../lib/errors';
import { BIND_ALL_ADDRESS, DEFAULT_DEV_LOGGER_PORT, DEFAULT_LIVERELOAD_PORT, DEFAULT_SERVER_PORT, IONIC_LAB_URL } from '../lib/serve';

export async function serve(env: IonicEnvironment, inputs: CommandLineInputs, options: CommandLineOptions): Promise<ServeDetails> {
  await env.hooks.fire('watch:before', { env });

  const [ platform ] = inputs;

  let serverDetails: ServeDetails;
  const serveOptions = cliOptionsToServeOptions(options);

  const project = await env.project.load();

  if (project.type === 'ionic1') {
    const { serve } = await import('../lib/ionic1/serve');
    serverDetails = await serve({ env, options: serveOptions });
  } else if (project.type === 'ionic-angular') {
    const { serve } = await import('../lib/ionic-angular/serve');
    serverDetails = await serve({ env, options: {
      platform,
      target: serveOptions.iscordovaserve ? 'cordova' : undefined,
      ...serveOptions,
    }});
  } else {
    throw new FatalException(
      `Cannot perform Ionic serve/watch for project type: ${chalk.bold(project.type)}.\n` +
      (project.type === 'custom' ? `Since you're using the ${chalk.bold('custom')} project type, this command won't work. The Ionic CLI doesn't know how to serve custom projects.\n\n` : '') +
      `If you'd like the CLI to try to detect your project type, you can unset the ${chalk.bold('type')} attribute in ${chalk.bold('ionic.config.json')}.\n`
    );
  }

  const devAppActive = !serveOptions.iscordovaserve && serveOptions.devapp;
  const devAppServiceName = `${project.name}@${serveOptions.port}`;

  if (devAppActive) {
    const { Publisher } = await import('@ionic/discover');
    const service = new Publisher('devapp', devAppServiceName, serveOptions.port);
    service.path = '/?devapp=true';

    service.on('error', (err: Error) => {
      // env.log.error(`Error in DevApp service: ${String(err.stack ? err.stack : err)}`);
    });

    try {
      await service.start();
    } catch (e) {
      // env.log.error(`Could not publish DevApp service: ${String(e.stack ? e.stack : e)}`);
    }
  }

  const localAddress = `http://localhost:${serverDetails.port}`;
  const fmtExternalAddress = (address: string) => `http://${address}:${serverDetails.port}`;

  env.log.ok(
    `Development server running!\n` +
    `Local: ${chalk.bold(localAddress)}\n` +
    (serverDetails.externalAddresses.length > 0 ? `External: ${serverDetails.externalAddresses.map(v => chalk.bold(fmtExternalAddress(v))).join(', ')}\n` : '') +
    (serveOptions.basicAuth ? `Basic Auth: ${chalk.bold(serveOptions.basicAuth[0])} / ${chalk.bold(serveOptions.basicAuth[1])}` : '')
    // (devAppActive ? `DevApp Channel: ${chalk.bold(devAppServiceName)}` : '')
  );

  if (project.type !== 'ionic-angular') { // TODO: app-scripts calls opn internally
    if (serveOptions.open) {
      const openOptions: string[] = [localAddress]
        .concat(serveOptions.lab ? [IONIC_LAB_URL] : [])
        .concat(serveOptions.browserOption ? [serveOptions.browserOption] : [])
        .concat(platform ? ['?ionicplatform=', platform] : []);

      const opn = await import('opn');
      opn(openOptions.join(''), { app: serveOptions.browser, wait: false });
    }
  }

  return serverDetails;
}

export function cliOptionsToServeOptions(options: CommandLineOptions) {
  const address = options['address'] ? String(options['address']) : BIND_ALL_ADDRESS;
  const port = str2num(options['port'], DEFAULT_SERVER_PORT);
  const livereloadPort = str2num(options['livereload-port'], DEFAULT_LIVERELOAD_PORT);
  const notificationPort = str2num(options['dev-logger-port'], DEFAULT_DEV_LOGGER_PORT);

  return {
    address,
    port,
    livereloadPort,
    notificationPort,
    consolelogs: options['consolelogs'] ? true : false,
    serverlogs: options['serverlogs'] ? true : false,
    livereload: typeof options['livereload'] === 'boolean' ? Boolean(options['livereload']) : true,
    proxy: typeof options['proxy'] === 'boolean' ? Boolean(options['proxy']) : true,
    lab: options['lab'] ? true : false,
    open: options['open'] ? true : false,
    browser: options['browser'] ? String(options['browser']) : undefined,
    browserOption: options['browseroption'] ? String(options['browseroption']) : undefined,
    basicAuth: options['auth'] ? <[string, string]>['ionic', String(options['auth'])] : undefined, // TODO: typescript can't infer tuple
    env: options['env'] ? String(options['env']) : undefined,
    devapp: typeof options['devapp'] === 'undefined' || options['devapp'] ? true : false,
    externalAddressRequired: options['externalAddressRequired'] ? true : false,
    iscordovaserve: typeof options['iscordovaserve'] === 'boolean' ? Boolean(options['iscordovaserve']) : false,
  };
}
