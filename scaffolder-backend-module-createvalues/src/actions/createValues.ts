import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

/**
 * Custom error class for create:values action
 */
class CreateValuesError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CreateValuesError';
  }
}

/**
 * Schema for input values
 */
const inputSchema = z.object({
  values: z.record(z.any())
    .optional()
    .default({})
    .refine(
      (values) => {
        // Ensure no reserved keys are used in input
        const reservedKeys = ['timestamp', 'datetime', 'date', 'time', 'formattedDate', 'formattedTime', 'formattedDateTime', 'uuid', 'shortId'];
        return !Object.keys(values).some(key => reservedKeys.includes(key));
      },
      { message: 'Input values cannot use reserved keys: timestamp, datetime, date, time, formattedDate, formattedTime, formattedDateTime, uuid, shortId' }
    ),
});

/**
 * Schema for output values
 */
const outputSchema = z.object({
  values: z.object({
    timestamp: z.number().int().positive(),
    datetime: z.string().min(1),
    date: z.string().min(1),
    time: z.string().min(1),
    formattedDate: z.string().min(1),
    formattedTime: z.string().min(1),
    formattedDateTime: z.string().min(1),
    uuid: z.string().uuid(),
    shortId: z.string().min(1),
  }).catchall(z.any()),
});

/**
 * Type definitions for better type safety
 */
type InputValues = z.infer<typeof inputSchema>['values'];
type OutputValues = z.infer<typeof outputSchema>['values'];

/**
 * Creates a `create:values` Scaffolder action.
 *
 * @remarks
 * This action generates computed values such as timestamps, UUIDs, and formatted strings
 * for use in templates. It is designed to be reliable and production-ready with:
 * - Comprehensive input validation
 * - Strict type checking
 * - Detailed error messages
 * - Performance optimizations
 * - Reserved key protection
 * 
 * @example
 * ```yaml
 * steps:
 *   - id: generated-values
 *     name: Generate Values
 *     action: create:values
 *     input:
 *       values:
 *         customValue: "my-custom-value"
 * 
 *   - id: use-values
 *     name: Use Generated Values
 *     action: fetch:template
 *     input:
 *       values:
 *         timestamp: ${{ steps.generated-values.output.values.timestamp }}
 *         shortId: ${{ steps.generated-values.output.values.shortId }}
 * ```
 *
 * @public
 */
export function createValuesAction() {
  return createTemplateAction<{
    values: Record<string, any>;
  }>({
    id: 'create:values',
    description: 'Injects computed values into the template context with strict validation and error handling',
    schema: {
      input: inputSchema,
      output: outputSchema,
    },
    async handler(ctx) {
      const startTime = performance.now();
      ctx.logger.info('Starting create:values action');

      try {
        // Validate input
        const validatedInput = inputSchema.parse(ctx.input);
        ctx.logger.debug('Input validation successful');

        // Start with validated input values
        const computedValues: Record<string, any> = { ...validatedInput.values };
        
        // Generate timestamp and date values with validation
        const now = DateTime.now();
        if (!now.isValid) {
          throw new CreateValuesError(
            'Invalid date/time generated',
            'INVALID_DATETIME'
          );
        }

        // Generate and validate timestamp
        const timestamp = now.toMillis();
        if (!Number.isInteger(timestamp) || timestamp <= 0) {
          throw new CreateValuesError(
            `Invalid timestamp generated: ${timestamp}`,
            'INVALID_TIMESTAMP'
          );
        }
        computedValues.timestamp = timestamp;

        // Generate and validate date/time strings
        const datetime = now.toISO();
        const date = now.toISODate();
        const time = now.toISOTime();
        
        if (!datetime || !date || !time) {
          throw new CreateValuesError(
            'Failed to generate date/time strings',
            'INVALID_DATETIME_STRINGS'
          );
        }

        computedValues.datetime = datetime;
        computedValues.date = date;
        computedValues.time = time;
        
        // Generate and validate formatted strings
        const formattedDate = now.toFormat('yyyy-MM-dd');
        const formattedTime = now.toFormat('HH:mm:ss');
        const formattedDateTime = now.toFormat('yyyy-MM-dd HH:mm:ss');

        if (!formattedDate || !formattedTime || !formattedDateTime) {
          throw new CreateValuesError(
            'Failed to generate formatted date/time strings',
            'INVALID_FORMATTED_STRINGS'
          );
        }

        computedValues.formattedDate = formattedDate;
        computedValues.formattedTime = formattedTime;
        computedValues.formattedDateTime = formattedDateTime;
        
        // Generate and validate UUID
        const uuid = uuidv4();
        if (!uuid) {
          throw new CreateValuesError(
            'Failed to generate UUID',
            'UUID_GENERATION_FAILED'
          );
        }
        computedValues.uuid = uuid;
        computedValues.shortId = uuid.split('-')[0];

        // Log computed values before validation (debug level)
        ctx.logger.debug('Generated computed values before validation', {
          values: computedValues,
        });

        // Validate final output
        const validatedOutput = outputSchema.parse({ values: computedValues });
        
        // Additional validation for timestamp
        if (!Number.isFinite(validatedOutput.values.timestamp)) {
          throw new CreateValuesError(
            'Timestamp is not a valid number',
            'INVALID_TIMESTAMP_TYPE'
          );
        }

        // Return validated values
        ctx.output('values', validatedOutput.values);
        
        // Log success with performance metrics
        const endTime = performance.now();
        ctx.logger.info('Successfully created computed values', {
          duration: `${(endTime - startTime).toFixed(2)}ms`,
          timestamp: validatedOutput.values.timestamp,
          uuid: validatedOutput.values.uuid,
        });

      } catch (error) {
        // Enhanced error handling
        if (error instanceof z.ZodError) {
          const errorDetails = error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          }));
          
          ctx.logger.error('Validation error in create:values action', {
            errors: errorDetails,
          });
          
          throw new CreateValuesError(
            `Validation failed: ${errorDetails.map(e => `${e.path}: ${e.message}`).join(', ')}`,
            'VALIDATION_ERROR'
          );
        }

        if (error instanceof CreateValuesError) {
          ctx.logger.error(`Error in create:values action: ${error.message}`, {
            code: error.code,
          });
          throw error;
        }

        // Handle unexpected errors
        ctx.logger.error('Unexpected error in create:values action', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        throw new CreateValuesError(
          'An unexpected error occurred while creating values',
          'UNEXPECTED_ERROR'
        );
      }
    },
  });
} 