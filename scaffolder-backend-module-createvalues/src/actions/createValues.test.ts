import { createValuesAction } from './createValues';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';

describe('create:values', () => {
  it('creates default computed values', async () => {
    const action = createValuesAction();
    const mockContext = createMockActionContext({
      input: {
        values: {},
      },
    });

    await action.handler(mockContext);

    expect(mockContext.output).toHaveBeenCalledWith('values', expect.objectContaining({
      timestamp: expect.any(Number),
      datetime: expect.any(String),
      date: expect.any(String),
      time: expect.any(String),
      formattedDate: expect.any(String),
      formattedTime: expect.any(String),
      formattedDateTime: expect.any(String),
      uuid: expect.any(String),
      shortId: expect.any(String),
    }));
  });

  it('preserves input values while adding computed values', async () => {
    const action = createValuesAction();
    const mockContext = createMockActionContext({
      input: {
        values: {
          customValue: 'test-value',
          existingId: '12345',
        },
      },
    });
    
    await action.handler(mockContext);

    expect(mockContext.output).toHaveBeenCalledWith(
      'values',
      expect.objectContaining({
        customValue: 'test-value',
        existingId: '12345',
        timestamp: expect.any(Number),
        uuid: expect.any(String),
      }),
    );
  });
}); 