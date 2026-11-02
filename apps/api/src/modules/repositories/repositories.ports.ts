export interface InstallationDirectory {
  activeInstallations(userId: string): Promise<{ githubInstallationId: number }[]>
  installationToken(installationId: number): Promise<string | undefined>
  userCanAccess(userId: string, repository: { owner: string; name: string }): Promise<boolean>
}
