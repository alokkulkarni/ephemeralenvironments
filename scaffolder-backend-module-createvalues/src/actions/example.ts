import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { z } from 'zod';

/**
 * Creates an `acme:example` Scaffolder action.
 *
 * @remarks
 *
 * See {@link https://example.com} for more information.
 *
 * @public
 */
export function createExampleAction() {
  // For more information on how to define custom actions, see
  //   https://backstage.io/docs/features/software-templates/writing-custom-actions
  return createTemplateAction<{
    myParameter: string;
  }>({
    id: 'custom:create:values',
    description: 'Injects custom values into the template context',
    schema: {
      input: z.object({
        values: z.record(z.any()),
      }),
    },
    async handler(ctx) {
      ctx.logger.info(
        `Running example template with parameters: ${ctx.input.myParameter}`,
      );

      if (ctx.input.myParameter === 'foo') {
        throw new Error(`myParameter cannot be 'foo'`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  });
}
