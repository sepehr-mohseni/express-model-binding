import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ModelBinder } from '../core/ModelBinder';
import { BindOptions, ModelBindingsConfig } from '../core/types';
import { logger } from '../utils/logger';
import { isValidParamName } from '../utils/validators';
import { BindingError } from '../errors';

/**
 * Maximum length for route parameter values to prevent DoS
 */
const MAX_PARAM_VALUE_LENGTH = 1024;

/**
 * Sanitize and validate parameter value
 */
function sanitizeParamValue(value: string | undefined): string {
  if (!value) return '';
  if (value.length > MAX_PARAM_VALUE_LENGTH) {
    return value.slice(0, MAX_PARAM_VALUE_LENGTH);
  }
  return value;
}

/**
 * Create middleware that binds a model to a route parameter
 *
 * @param paramName - The route parameter name (without ':')
 * @param model - The model class/schema/table
 * @param options - Binding options
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/:user', bindModel('user', User), (req, res) => {
 *   res.json(req.user);
 * });
 */
export function bindModel(
  paramName: string,
  model: unknown,
  options: BindOptions = {}
): RequestHandler {
  // Security: Validate param name at middleware creation time
  if (!isValidParamName(paramName)) {
    throw new BindingError(
      `Invalid parameter name '${paramName}': must be alphanumeric with underscores`,
      new Error('Invalid parameter name')
    );
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if parameter exists in route
      if (!(paramName in req.params)) {
        logger.warn(`Parameter '${paramName}' not found in route`);
        if (options.optional) {
          return next();
        }
      }

      // Security: Sanitize parameter value
      const originalValue = req.params[paramName];
      req.params[paramName] = sanitizeParamValue(originalValue);

      // Perform the binding
      const result = await ModelBinder.bind(req, res, paramName, model, options);

      if (!result.success) {
        return next(result.error);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Bind multiple models in a single middleware
 *
 * @param bindings - Object mapping parameter names to model configs
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/:user/posts/:post',
 *   bindModels({
 *     user: { model: User },
 *     post: { model: Post, options: { include: ['comments'] } }
 *   }),
 *   (req, res) => {
 *     res.json({ user: req.user, post: req.post });
 *   }
 * );
 */
export function bindModels(bindings: ModelBindingsConfig): RequestHandler {
  // Security: Validate all param names at middleware creation time
  for (const paramName of Object.keys(bindings)) {
    if (!isValidParamName(paramName)) {
      throw new BindingError(
        `Invalid parameter name '${paramName}': must be alphanumeric with underscores`,
        new Error('Invalid parameter name')
      );
    }
  }

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Bind all models sequentially
      for (const [paramName, config] of Object.entries(bindings)) {
        if (!(paramName in req.params)) {
          logger.warn(`Parameter '${paramName}' not found in route`);
          if (config.options?.optional) {
            continue;
          }
        }

        // Security: Sanitize parameter value
        const originalValue = req.params[paramName];
        req.params[paramName] = sanitizeParamValue(originalValue);

        const result = await ModelBinder.bind(
          req,
          res,
          paramName,
          config.model,
          config.options || {}
        );

        if (!result.success) {
          return next(result.error);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Bind a model optionally (don't throw 404 if not found)
 *
 * @param paramName - The route parameter name
 * @param model - The model class/schema/table
 * @param options - Binding options
 * @returns Express middleware function
 *
 * @example
 * app.get('/posts/:post?', bindOptional('post', Post), (req, res) => {
 *   if (req.post) {
 *     res.json(req.post);
 *   } else {
 *     res.json({ message: 'No specific post' });
 *   }
 * });
 */
export function bindOptional(
  paramName: string,
  model: unknown,
  options: BindOptions = {}
): RequestHandler {
  return bindModel(paramName, model, { ...options, optional: true });
}

/**
 * Create a middleware that binds a model using a custom key
 *
 * @param paramName - The route parameter name
 * @param model - The model class/schema/table
 * @param key - The field to search by
 * @param options - Additional binding options
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/by-email/:email', bindByKey('email', User, 'email'), (req, res) => {
 *   res.json(req.email);
 * });
 */
export function bindByKey(
  paramName: string,
  model: unknown,
  key: string,
  options: BindOptions = {}
): RequestHandler {
  return bindModel(paramName, model, { ...options, key });
}

/**
 * Create a middleware that binds a model and attaches it with a custom name
 *
 * @param paramName - The route parameter name
 * @param model - The model class/schema/table
 * @param attachAs - The name to attach the model as on the request
 * @param options - Additional binding options
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/:id', bindAs('id', User, 'currentUser'), (req, res) => {
 *   res.json(req.currentUser);
 * });
 */
export function bindAs(
  paramName: string,
  model: unknown,
  attachAs: string,
  options: BindOptions = {}
): RequestHandler {
  return bindModel(paramName, model, { ...options, as: attachAs });
}

/**
 * Create a middleware that binds a model with caching
 *
 * @param paramName - The route parameter name
 * @param model - The model class/schema/table
 * @param ttl - Cache TTL in milliseconds (default: 60000)
 * @param options - Additional binding options
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/:user', bindCached('user', User, 300000), (req, res) => {
 *   res.json(req.user);
 * });
 */
export function bindCached(
  paramName: string,
  model: unknown,
  ttl: number = 60000,
  options: BindOptions = {}
): RequestHandler {
  return bindModel(paramName, model, { ...options, cache: true, cacheTTL: ttl });
}

/**
 * Create a middleware that binds a model with eager-loaded relations
 *
 * @param paramName - The route parameter name
 * @param model - The model class/schema/table
 * @param relations - Relations to eager load
 * @param options - Additional binding options
 * @returns Express middleware function
 *
 * @example
 * app.get('/users/:user', bindWithRelations('user', User, ['posts', 'profile']), (req, res) => {
 *   res.json(req.user);
 * });
 */
export function bindWithRelations(
  paramName: string,
  model: unknown,
  relations: string[] | Record<string, unknown>,
  options: BindOptions = {}
): RequestHandler {
  return bindModel(paramName, model, { ...options, include: relations });
}
