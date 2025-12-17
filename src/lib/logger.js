const kleur = require('kleur');

const LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function getLevel() {
  const raw = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[raw] ?? LEVELS.info;
}

function timestamp() {
  return new Date().toISOString();
}

function write(line) {
  // eslint-disable-next-line no-console
  console.log(line);
}

function logAt(levelName, formatter, message, meta) {
  const configuredLevel = getLevel();
  const level = LEVELS[levelName] ?? LEVELS.info;
  if (configuredLevel < level) return;

  const tag = formatter(levelName.toUpperCase().padEnd(5));
  const base = `${kleur.gray(timestamp())} ${tag} ${message}`;

  if (meta === undefined) {
    write(base);
    return;
  }

  // Keep meta readable without forcing JSON everywhere.
  write(`${base} ${kleur.gray(typeof meta === 'string' ? meta : JSON.stringify(meta))}`);
}

const logger = {
  info(message, meta) {
    logAt('info', (s) => kleur.cyan(s), message, meta);
  },
  warn(message, meta) {
    logAt('warn', (s) => kleur.yellow(s), message, meta);
  },
  error(message, meta) {
    logAt('error', (s) => kleur.red().bold(s), message, meta);
  },
  debug(message, meta) {
    logAt('debug', (s) => kleur.magenta(s), message, meta);
  },
  success(message, meta) {
    // Map success to info level.
    logAt('info', (s) => kleur.green().bold(s), message, meta);
  },
};

module.exports = {
  logger,
};
