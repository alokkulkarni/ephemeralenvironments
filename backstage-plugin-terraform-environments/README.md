# Backstage Plugin: Terraform Environments

![npm](https://img.shields.io/badge/version-0.20.0-blue)

A Backstage plugin for managing ephemeral Terraform environments using GitHub Issues as metadata and GitHub Actions for lifecycle automation.

## Features

- List, view, and destroy ephemeral environments managed by Terraform
- Integrates with GitHub Issues and Actions for environment metadata and automation
- Uses Backstage's standard auth providers for GitHub authentication
- Enhanced GitHub token handling with support for multiple token formats
- Robust authentication with multiple fallback methods
- Detailed request and response logging for troubleshooting
- Uses Octokit for reliable GitHub API interactions
- Designed for use with Backstage

## Installation

```sh
yarn add @invincible/backstage-plugin-terraform-environments
# or
npm install @invincible/backstage-plugin-terraform-environments
```

**After installation, the plugin will automatically add the necessary export to your Backstage app's `packages/app/src/plugins.ts` file.**

## Configuration

1. **Register API implementations in your app:**

   In your `packages/app/src/apis.ts` file:
   ```tsx
   import { 
     createApiFactory,
     configApiRef, 
   } from '@backstage/core-plugin-api';
   import { 
     scmIntegrationsApiRef,
     ScmIntegrationsApi,
     scmAuthApiRef,
   } from '@backstage/integration-react';
   import {
     environmentApi,
     environmentApiRef,
     terraformEnvironmentsPlugin,
   } from '@invincible/backstage-plugin-terraform-environments';

   export const apis = [
     // ... other APIs

     // Add the scmIntegrationsApi if not already present
     createApiFactory({
       api: scmIntegrationsApiRef,
       deps: { configApi: configApiRef },
       factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
     }),

     // Make sure you have the GitHub auth provider configured
     // This is usually already set up in a default Backstage application

     // Add the environmentApi from the plugin
     environmentApi,
   ];
   ```

2. **Add a route in your app:**

   In `packages/app/src/App.tsx`:
   ```tsx
   import { TerraformEnvironmentsPage } from '@invincible/backstage-plugin-terraform-environments';

   // Inside your routes:
   <Route path="/terraform-environments" element={<TerraformEnvironmentsPage />} />
   ```

3. **Configure GitHub Authentication:**

   This plugin uses Backstage's standard GitHub authentication. Ensure you have GitHub authentication configured in your `app-config.yaml`:

   ```yaml
   auth:
     environment: development
     providers:
       github:
         development:
           clientId: ${AUTH_GITHUB_CLIENT_ID}
           clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
   
   integrations:
     github:
       - host: github.com
         token: ${GITHUB_TOKEN}
   ```

   For production environments, follow the [Backstage documentation](https://backstage.io/docs/auth/) on configuring authentication providers.

4. **Configure default repository for environments:**

   You can specify default GitHub owner and repository for environments in `app-config.yaml`:
   ```yaml
   terraformEnvironments:
     defaultOwner: yourOrgName
     defaultRepo: yourRepoName
   ```

   These defaults will be used if entity annotations are not provided.

## Entity Annotations

This plugin uses the following annotations in your `catalog-info.yaml`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example-service
  annotations:
    # Required annotations
    terraform-environments/project-name: "my-project"
    terraform-environments/org-name: "my-org"
    terraform-environments/squad-name: "my-squad"
    
    # Optional annotations (fallback to config if not provided)
    terraform-environments/github-owner: "myOrg"
    terraform-environments/github-repo: "my-environments-repo"
```

### Annotation Reference

| Annotation Key | Required | Description |
|----------------|----------|-------------|
| `terraform-environments/project-name` | Yes | Name of the project |
| `terraform-environments/org-name` | Yes | Name of the organization |
| `terraform-environments/squad-name` | Yes | Name of the squad |
| `terraform-environments/github-owner` | No | GitHub organization/owner (falls back to config) |
| `terraform-environments/github-repo` | No | GitHub repository name (falls back to config) |

## Usage

1. Add the required annotations to your component's `catalog-info.yaml`
2. Navigate to `/terraform-environments` in your Backstage app
3. View and manage your environments:
   - List all environments for your project
   - View environment details
   - Destroy environments when no longer needed

## Environment Metadata

Each environment is tracked using a GitHub issue with the following metadata structure:

```json
{
  "environment": {
    "name": "optional-name",
    "project": "project-name",
    "organization": "org-name",
    "squad": "squad-name",
    "type": "dev|staging|prod",
    "created_at": "timestamp",
    "pr_number": 123,
    "status": "creating|active|failed|destroying|destroyed",
    "lifetimeDays": 7,
    "autoDestroy": true
  }
}
```

## Troubleshooting

### Postinstall Script Error

If you encounter an error related to the postinstall script:

```
Error: Cannot find module '.../scripts/add-plugin-to-app.js'
```

You can manually add the plugin export to your `packages/app/src/plugins.ts` file:

```ts
export { terraformEnvironmentsPlugin, TerraformEnvironmentsPage } from '@invincible/backstage-plugin-terraform-environments';
```

### React Hooks Error

If you encounter an error like this when navigating to the terraform-environments page:

```
Invalid hook call. Hooks can only be called inside of the body of a function component.
```

This is typically caused by duplicate React dependencies. Make sure you're using the latest version of the plugin (0.8.0+) which properly defines React and Backstage packages as peerDependencies instead of direct dependencies.

If you're still seeing this error, try cleaning your node_modules and reinstalling:

```sh
# In your Backstage app root directory
rm -rf node_modules
yarn install
```

### API Not Implemented Error

If you see the following error:

```
NotImplementedError: No implementation available for apiRef{plugin.terraform-environments.api}
```

This means you haven't properly registered the APIs required by the plugin. Make sure you've followed step 1 in the Configuration section above to register the plugin's APIs in your Backstage app's `apis.ts` file.

### Authentication Errors

If you encounter GitHub authentication errors, make sure:

1. GitHub authentication is properly configured in your Backstage app
2. The user is logged in to Backstage with GitHub authentication
3. The GitHub token has sufficient permissions (repo and workflow)

If not logged in, you may see a login prompt when visiting the plugin's page. This is expected behavior.

### GitHub Token Error

If you encounter an error like:
```
GitHub API error: GitHub authentication failed: Failed to retrieve valid GitHub token
```

The plugin now includes enhanced GitHub token handling that supports multiple token formats and provides better error messages. The plugin will try these methods in sequence:

1. **GitHub Authentication with extensive permissions** - The plugin first tries to get a token with full repo and workflow permissions
2. **GitHub Authentication with basic permissions** - If the first method fails, it falls back to basic authentication
3. **Environment Variable** - For development environments, it can use the `GITHUB_TOKEN` environment variable as a last resort

To troubleshoot token issues:

1. **Check browser console for detailed logs** - The plugin now includes comprehensive logging that shows each token retrieval attempt
2. **Verify you're logged in to Backstage** with GitHub authentication
3. **Confirm GitHub auth provider is configured** in your `app-config.yaml` with the correct format:

```yaml
auth:
  environment: development
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

4. **Set the environment variable for testing** - For development environments, you can set the `GITHUB_TOKEN` environment variable:

```sh
export GITHUB_TOKEN=your_github_personal_access_token
```

5. **Check token permissions** - Make sure your token has sufficient permissions for 'repo' and 'workflow'

Authentication sessions may expire, so try logging out and logging back in to Backstage if you still have issues.

## Development

- Clone the repo and run:
  ```sh
  yarn install
  yarn build
  ```

## Publishing to npm

To publish this package to npm, follow these steps:

1. Ensure your package.json has the correct version number
2. Build the package:
   ```sh
   yarn build
   ```

3. Prepare the package:
   ```sh
   yarn prepack
   ```

4. Pack the package for testing (optional):
   ```sh
   yarn pack
   ```

5. Publish to npm:
   ```sh
   npm login  # if not already logged in
   npm publish --access public
   ```

## Contributing

Contributions are welcome! Please open issues or pull requests.

## License

[Apache-2.0](./LICENSE) 