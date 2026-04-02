import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(env.PORT);

console.log(`Server is running on port ${env.PORT}`);

let shuttingDown = false;

const shutdown = (exitCode: number): void => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  const forceExitTimer = setTimeout(() => {
    void prisma.$disconnect().finally(() => {
      process.exit(exitCode);
    });
  }, 10_000);

  forceExitTimer.unref();

  server.close(() => {
    clearTimeout(forceExitTimer);

    void prisma.$disconnect().finally(() => {
      process.exit(exitCode);
    });
  });
};

process.on('SIGINT', () => {
  shutdown(0);
});

process.on('SIGTERM', () => {
  shutdown(0);
});

process.on('unhandledRejection', () => {
  shutdown(1);
});

process.on('uncaughtException', () => {
  shutdown(1);
});
