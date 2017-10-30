import * as path from 'path';

import chalk from 'chalk';

import { IonicEnvironment, StarterTemplate, StarterTemplateType } from '../definitions';

import { ERROR_FILE_INVALID_JSON, ERROR_FILE_NOT_FOUND, fsReadDir, fsReadJsonFile, fsUnlink, fsWriteJsonFile } from '@ionic/cli-framework/utils/fs';

export function isProjectNameValid(name: string): boolean {
  return name !== '.';
}

/**
 * If project only contains files generated by GH, it’s safe.
 * We also special case IJ-based products .idea because it integrates with CRA:
 * https://github.com/facebookincubator/create-react-app/pull/368#issuecomment-243446094
 */
export async function isSafeToCreateProjectIn(root: string): Promise<boolean> {
  const validFiles = [
    '.DS_Store', 'Thumbs.db', '.git', '.gitignore', '.idea', 'README.md', 'LICENSE'
  ];

  const entries = await fsReadDir(root);

  return entries.every((file) => {
    return validFiles.indexOf(file) >= 0;
  });
}

export function getStarterTemplateText(templateList: StarterTemplate[]): string {
  let headerLine = chalk.bold(`Ionic Starter templates`);
  let formattedTemplateList = getStarterTemplateTextList(templateList);

  return `
    ${headerLine}
      ${formattedTemplateList.join(`
      `)}
  `;
}

export function getStarterTemplateTextList(templateList: StarterTemplate[]): string[] {

  return templateList.map(({ name, type, description }) => {
    let templateName = chalk.green(name);

    return `${templateName} ${Array(20 - name.length).join(chalk.dim('.'))} ${chalk.bold(type)} ${description}`;
  });
}

export function getHelloText(): string {
  return `
${chalk.bold('♬ ♫ ♬ ♫  Your Ionic app is ready to go! ♬ ♫ ♬ ♫')}

${chalk.bold('Run your app in the browser (great for initial development):')}
  ${chalk.green('ionic serve')}

${chalk.bold('Run on a device or simulator:')}
  ${chalk.green('ionic cordova run ios')}

${chalk.bold('Test and share your app on a device with the Ionic View app:')}
  http://view.ionic.io
  `;
}

export async function patchPackageJsonForCli(env: IonicEnvironment, appName: string, starterType: StarterTemplateType, pathToProject: string): Promise<void> {
  const patchPackagePath = path.resolve(pathToProject, 'patch.package.json');
  const packagePath = path.resolve(pathToProject, 'package.json');

  let pkg;
  let patch;

  try {
    pkg = await fsReadJsonFile(packagePath);
  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`${packagePath} is not valid JSON.`);
    } else if (e === ERROR_FILE_INVALID_JSON) {
      throw new Error(`${packagePath} is not valid JSON.`);
    }
    throw e;
  }

  try {
    patch = await fsReadJsonFile(patchPackagePath);

    const merge = await import('lodash/merge');
    let finalPackage = merge(pkg, patch);

    await fsWriteJsonFile(packagePath, finalPackage, { encoding: 'utf8' });
    fsUnlink(patchPackagePath); // no await

  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      // no need to do anything
    } else if (e === ERROR_FILE_INVALID_JSON) {
      throw new Error(`${patchPackagePath} is not valid JSON.`);
    } else {
      throw e;
    }
  }
}

export async function updatePackageJsonForCli(env: IonicEnvironment, appName: string, starterType: StarterTemplateType, pathToProject: string): Promise<void> {
  const filePath = path.resolve(pathToProject, 'package.json');
  try {
    let jsonStructure = await fsReadJsonFile(filePath);

    jsonStructure['name'] = appName;
    jsonStructure['version'] = '0.0.1';
    jsonStructure['description'] = 'An Ionic project';

    await fsWriteJsonFile(filePath, jsonStructure, { encoding: 'utf8' });

  } catch (e) {
    if (e === ERROR_FILE_NOT_FOUND) {
      throw new Error(`${filePath} not found`);
    } else if (e === ERROR_FILE_INVALID_JSON) {
      throw new Error(`${filePath} is not valid JSON.`);
    }
    throw e;
  }
}

export async function createProjectConfig(appName: string, starterType: StarterTemplateType, pathToProject: string): Promise<void> {
  const filePath = path.resolve(pathToProject, 'ionic.config.json');
  const jsonStructure = {
    name: appName,
    app_id: '',
    type: starterType.id
  };

  await fsWriteJsonFile(filePath, jsonStructure, { encoding: 'utf8' });
}

export const STARTER_TYPES: StarterTemplateType[] = [
  {
    id: 'ionic-angular',
    url: 'https://github.com/ionic-team/ionic2-app-base',
    baseArchive: 'https://github.com/ionic-team/ionic2-app-base/archive/<BRANCH_NAME>.tar.gz',
    globalDependencies: [],
    localDependencies: [],
  },
  {
    id: 'ionic1',
    url: 'https://github.com/ionic-team/ionic-app-base',
    baseArchive: 'https://github.com/ionic-team/ionic-app-base/archive/<BRANCH_NAME>.tar.gz',
    globalDependencies: [],
    localDependencies: [],
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'tabs',
    type: 'ionic-angular',
    description: 'A starting project with a simple tabbed interface',
    url: 'https://github.com/ionic-team/ionic2-starter-tabs',
    archive: 'https://github.com/ionic-team/ionic2-starter-tabs/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'blank',
    type: 'ionic-angular',
    description: 'A blank starter project',
    url: 'https://github.com/ionic-team/ionic2-starter-blank',
    archive: 'https://github.com/ionic-team/ionic2-starter-blank/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'sidemenu',
    type: 'ionic-angular',
    description: 'A starting project with a side menu with navigation in the content area',
    url: 'https://github.com/ionic-team/ionic2-starter-sidemenu',
    archive: 'https://github.com/ionic-team/ionic2-starter-sidemenu/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'super',
    type: 'ionic-angular',
    description: 'A starting project complete with pre-built pages, providers and best practices for Ionic development.',
    url: 'https://github.com/ionic-team/ionic-starter-super',
    archive: 'https://github.com/ionic-team/ionic-starter-super/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'mobile',
    type: 'ionic-angular',
    description: 'A custom full features for Ionic development.',
    url: 'https://github.com/vellengs/ionic-starter-super',
    archive: 'https://github.com/vellengs/ionic-starter-super/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'conference',
    type: 'ionic-angular',
    description: 'A project that demonstrates a realworld application',
    url: 'https://github.com/ionic-team/ionic-conference-app',
    archive: 'https://github.com/ionic-team/ionic-conference-app/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'tutorial',
    type: 'ionic-angular',
    description: 'A tutorial based project that goes along with the Ionic documentation',
    url: 'https://github.com/ionic-team/ionic2-starter-tutorial',
    archive: 'https://github.com/ionic-team/ionic2-starter-tutorial/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'aws',
    type: 'ionic-angular',
    description: 'AWS Mobile Hub Starter',
    url: 'https://github.com/ionic-team/ionic2-starter-aws',
    archive: 'https://github.com/ionic-team/ionic2-starter-aws/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'tabs',
    type: 'ionic1',
    description: 'A starting project for Ionic using a simple tabbed interface',
    url: 'https://github.com/ionic-team/ionic-starter-tabs',
    archive: 'https://github.com/ionic-team/ionic-starter-tabs/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'blank',
    type: 'ionic1',
    description: 'A blank starter project for Ionic',
    url: 'https://github.com/ionic-team/ionic-starter-blank',
    archive: 'https://github.com/ionic-team/ionic-starter-blank/archive/<BRANCH_NAME>.tar.gz'
  },
  {
    name: 'sidemenu',
    type: 'ionic1',
    description: 'A starting project for Ionic using a side menu with navigation in the content area',
    url: 'https://github.com/ionic-team/ionic-starter-sidemenu',
    archive: 'https://github.com/ionic-team/ionic-starter-sidemenu/archive/<BRANCH_NAME>.tar.gz'
  },
  // {
  //   name: 'complex-list',
  //   type: 'ionic1',
  //   description: 'A complex list starter template',
  //   url: 'https://github.com/ionic-team/ionic-starter-maps',
  //   archive: 'https://github.com/ionic-team/ionic-starter-complex-list/archive/<BRANCH_NAME>.tar.gz'
  // },
  {
    name: 'maps',
    type: 'ionic1',
    description: 'An Ionic starter project using Google Maps and a side menu',
    url: 'https://github.com/ionic-team/ionic-starter-maps',
    archive: 'https://github.com/ionic-team/ionic-starter-maps/archive/<BRANCH_NAME>.tar.gz'
  },
];
