import { createRouteRef, createRoutableExtension } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'terraform-environments',
});
 
export const TerraformEnvironmentsPage = createRoutableExtension({
  component: () =>
    import('./components/TerraformEnvironmentsPage').then(m => m.TerraformEnvironmentsPage),
  mountPoint: rootRouteRef,
}); 