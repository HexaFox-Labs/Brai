export const deploymentMethods = {
  recordDeployment({
    environment,
    slot = null,
    branch,
    commit,
    domain,
    webOtaVersion = null,
    apkVersion = null,
    shortChanges,
    detailedChanges,
    reason,
    deployedAtUtc,
  }) {
    this.db
      .prepare(`
        INSERT INTO deployment_records (
          environment,
          slot,
          branch,
          commit_sha,
          domain,
          web_ota_version,
          apk_version,
          short_changes,
          detailed_changes,
          reason,
          deployed_at_utc,
          created_at_utc
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        environment,
        slot,
        branch,
        commit,
        domain,
        webOtaVersion,
        apkVersion,
        shortChanges,
        detailedChanges,
        reason,
        deployedAtUtc,
        new Date().toISOString(),
      );
  },

  listDeploymentRecords({ environment = null } = {}) {
    if (environment) {
      return this.db
        .prepare("SELECT * FROM deployment_records WHERE environment = ? ORDER BY deployed_at_utc DESC, id DESC")
        .all(environment);
    }
    return this.db.prepare("SELECT * FROM deployment_records ORDER BY deployed_at_utc DESC, id DESC").all();
  },
};
