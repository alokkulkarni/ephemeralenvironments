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
        values: z.record(z.any()),
      }),
    },
    async handler(ctx) {
      ctx.logger.info(`Running create:values action`);
      
      // Start with any input values
      const computedValues = { ...ctx.input.values };
      
      // Add timestamp and date values
      const now = DateTime.now();
      computedValues.timestamp = now.toMillis();
      computedValues.datetime = now.toISO();
      computedValues.date = now.toISODate();
      computedValues.time = now.toISOTime();
      
      // Format date in various formats
      computedValues.formattedDate = now.toFormat('yyyy-MM-dd');
      computedValues.formattedTime = now.toFormat('HH:mm:ss');
      computedValues.formattedDateTime = now.toFormat('yyyy-MM-dd HH:mm:ss');
      
      // Create a unique ID for the resource
      computedValues.uuid = uuidv4();
      computedValues.shortId = uuidv4().split('-')[0];
      
      // Return the computed values
      ctx.output('values', computedValues);
      
      ctx.logger.info(`Created computed values: ${JSON.stringify(computedValues)}`);
    },
  });
} 