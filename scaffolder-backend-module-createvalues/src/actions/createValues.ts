import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

/**
 * Creates a `create:values` Scaffolder action.
 *
 * @remarks
 * This action generates computed values such as timestamps, UUIDs, and formatted strings
 * for use in templates.
 *
 * @public
 */
export function createValuesAction() {
  return createTemplateAction<{
    values: Record<string, any>;
  }>({
    id: 'create:values',
    description: 'Injects computed values into the template context',
    schema: {
      input: z.object({
        values: z.record(z.any()).optional().default({}),
      }),
      output: z.object({
        values: z.object({
          timestamp: z.number(),
          datetime: z.string(),
          date: z.string(),
          time: z.string(),
          formattedDate: z.string(),
          formattedTime: z.string(),
          formattedDateTime: z.string(),
          uuid: z.string(),
          shortId: z.string(),
        }).catchall(z.any()), // Allow any additional values from input
      }),
    },
    async handler(ctx) {
      ctx.logger.info(`Running create:values action`);
      
      // Start with any input values
      const computedValues: Record<string, any> = { ...ctx.input.values };
      
      try {
        // Add timestamp and date values
        const now = DateTime.now();
        computedValues.timestamp = Number(now.toMillis()); // Ensure it's a number
        computedValues.datetime = now.toISO() || ''; // Ensure it's a string
        computedValues.date = now.toISODate() || ''; // Ensure it's a string
        computedValues.time = now.toISOTime() || ''; // Ensure it's a string
        
        // Format date in various formats
        computedValues.formattedDate = now.toFormat('yyyy-MM-dd');
        computedValues.formattedTime = now.toFormat('HH:mm:ss');
        computedValues.formattedDateTime = now.toFormat('yyyy-MM-dd HH:mm:ss');
        
        // Create a unique ID for the resource
        const uuid = uuidv4();
        computedValues.uuid = uuid;
        computedValues.shortId = uuid.split('-')[0];

        // Validate the output matches the schema
        const outputSchema = z.object({
          values: z.object({
            timestamp: z.number(),
            datetime: z.string(),
            date: z.string(),
            time: z.string(),
            formattedDate: z.string(),
            formattedTime: z.string(),
            formattedDateTime: z.string(),
            uuid: z.string(),
            shortId: z.string(),
          }).catchall(z.any()), // Allow any additional values from input
        });

        const validatedOutput = outputSchema.parse({ values: computedValues });
        
        // Return the validated computed values
        ctx.output('values', validatedOutput.values);
        
        ctx.logger.info(`Created computed values: ${JSON.stringify(validatedOutput.values)}`);
      } catch (error) {
        ctx.logger.error(`Error creating computed values: ${error}`);
        throw new Error(`Failed to create computed values: ${error}`);
      }
    },
  });
} 