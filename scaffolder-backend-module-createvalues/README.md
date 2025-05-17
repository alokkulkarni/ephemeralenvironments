# @internal/plugin-scaffolder-backend-module-createvalues

The `create:values` module for [@backstage/plugin-scaffolder-backend](https://www.npmjs.com/package/@backstage/plugin-scaffolder-backend).

## Description

This plugin provides a custom action called `create:values` that can be used in Backstage templates to generate computed values like timestamps, UUIDs, and formatted strings.

## Installation

Install the package in your Backstage backend:

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @internal/plugin-scaffolder-backend-module-createvalues
```

Register the module in your backstage backend:

```typescript
// packages/backend/src/index.ts
import createValues from '@internal/plugin-scaffolder-backend-module-createvalues';

const backend = createBackend();
// ... other register calls
backend.add(createValues);
```

## Usage

You can use the `create:values` action in your template YAML files:

```yaml
steps:
  - id: createvalues
    name: Create Computed Values
    action: create:values
    # Optional: you can provide input values
    input:
      values:
        customPrefix: my-app
        environment: production

  - id: template
    name: Fetch Skeleton
    action: fetch:template
    input:
      url: ./skeleton
      values:
        # Use any of the computed values
        name: ${{ steps.createvalues.output.values.customPrefix }}-${{ steps.createvalues.output.values.shortId }}
        deploymentTime: ${{ steps.createvalues.output.values.formattedDateTime }}
        resourceId: ${{ steps.createvalues.output.values.uuid }}
```

## Available Computed Values

The `create:values` action provides the following computed values:

| Value | Description | Example |
|-------|-------------|---------|
| `timestamp` | Current timestamp in milliseconds | `1699537269571` |
| `datetime` | ISO 8601 datetime | `2023-11-09T14:01:09.571Z` |
| `date` | ISO 8601 date | `2023-11-09` |
| `time` | ISO 8601 time | `14:01:09.571Z` |
| `formattedDate` | Formatted date (yyyy-MM-dd) | `2023-11-09` |
| `formattedTime` | Formatted time (HH:mm:ss) | `14:01:09` |
| `formattedDateTime` | Formatted datetime (yyyy-MM-dd HH:mm:ss) | `2023-11-09 14:01:09` |
| `uuid` | A UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| `shortId` | First segment of a UUID | `550e8400` |

Plus any values you provide in the input.

_This plugin was created through the Backstage CLI_
