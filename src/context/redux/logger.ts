import { Middleware } from "redux";
import { ReduxLoggerOptions, createLogger } from "redux-logger";

/**
 * Opciones de configuracion del logger
 * @url https://www.npmjs.com/package/@types/redux-logger
 */
const loggerOptions: ReduxLoggerOptions = {
  // Mostrar acciones colapsadas por defecto
  collapsed: true,
  // Mostrar la duracion de cada accion
  duration: true,
  // Mostrar la marca de tiempo de cada accion
  timestamp: true,
  // Mostrar diferencias en el estado previo y posterior
  diff: true,
  // Nivel de consola utilizado para registrar acciones ('log', 'console', 'warn', 'error', 'info')
  level: "info",
  // Registrar errores no capturados en la consola
  logErrors: true,
};

const logger: Middleware = createLogger(loggerOptions);

export default logger;
