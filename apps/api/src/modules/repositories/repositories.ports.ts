export interface InstallationDirectory {
  activeInstallations(userId: string): Promise<{ githubInstallationId: number }[]>
  installationToken(installationId: number): Promise<string | undefined>
}
