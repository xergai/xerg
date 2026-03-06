import { doctorOpenClaw, renderDoctorReport } from '@xergai/core';

export interface DoctorCommandOptions {
  logFile?: string;
  sessionsDir?: string;
}

export async function runDoctorCommand(options: DoctorCommandOptions) {
  const report = await doctorOpenClaw({
    logFile: options.logFile,
    sessionsDir: options.sessionsDir,
  });

  process.stdout.write(`${renderDoctorReport(report)}\n`);
}
