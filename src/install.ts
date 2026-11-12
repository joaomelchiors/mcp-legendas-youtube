// Entry point of the installer: npm run instalar (the script runs npm install and the build first).
// Installs the official yt-dlp of the fixed version (package.json, "config.ytDlpVersion") in the MCP's
// private folder, checking the checksum, and shows the command that registers the MCP in Claude Code.
// Ends with code 1 when the installation does not finish. Like index.ts, it only connects pieces (no unit test).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Result } from './domain/shared/result.js';
import { NodeCommandRunner } from './infra/engine/command-runner.js';
import { YtDlpExecutableLocator } from './infra/engine/ytDlpExecutable-locator.js';
import { FetchDownloader } from './infra/install/fetch-downloader.js';
import { InstallReportText } from './infra/install/installReport-text.js';
import { RegistrationCommand, type RegistrationCommands } from './infra/install/registration-command.js';
import { YtDlpInstaller, type InstallReport } from './infra/install/ytDlp-installer.js';
import { ErrorText } from './infra/error-text.js';

/** yt-dlp.exe has about 18 MB; two minutes is plenty even on a slow connection. */
const DOWNLOAD_TIMEOUT_MS: number = 120_000;

interface PackageJson {
  readonly config?: { readonly ytDlpVersion?: unknown };
}

/** The fixed yt-dlp version, the one that passed the canary. Updating it is changing this number in package.json. */
function fixedVersion(): string {
  const packageJson: PackageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as PackageJson;
  const version: unknown = packageJson.config?.ytDlpVersion;
  const isVersion: boolean = typeof version === 'string' && version.trim() !== '';
  if (!isVersion) throw new Error('o package.json não tem "config.ytDlpVersion"');
  return (version as string).trim();
}

async function start(): Promise<void> {
  const version: string = fixedVersion();
  const folder: string = YtDlpExecutableLocator.privateFolder();
  process.stdout.write(`Instalando o yt-dlp ${version} em ${folder}\n`);

  const installer: YtDlpInstaller = new YtDlpInstaller(
    new FetchDownloader(DOWNLOAD_TIMEOUT_MS),
    new NodeCommandRunner(),
    folder,
    process.platform,
    process.arch,
  );
  const installReturn: Result<InstallReport> = await installer.install(version);
  if (installReturn.isFailure) {
    process.stdout.write(InstallReportText.failure(installReturn));
    process.exitCode = 1;
    return;
  }

  const serverPath: string = fileURLToPath(new URL('./index.js', import.meta.url));
  const commands: RegistrationCommands = {
    user: RegistrationCommand.for(serverPath, 'user'),
    local: RegistrationCommand.for(serverPath, 'local'),
  };
  process.stdout.write(InstallReportText.success(installReturn.instance, commands));
}

start().catch((error: unknown) => {
  process.stdout.write(`Instalador parou com erro inesperado: ${ErrorText.of(error)}\n`);
  process.exitCode = 1;
});
